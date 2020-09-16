/**
 MIT License

 Copyright (c) 2020 Simon Neufville / XRSCodeWorks

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to deal
 in the Software without restriction, including without limitation the rights
 to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in all
 copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 SOFTWARE.
 */

/**
 * Project:     fac-payments-node
 * Filename:    index.js
 * Created by:  xerosai @ 13/09/2020 11:47 AM
 * @author:     Simon Neufville <simon@xrscodeworks.com>
 */

const axios = require('axios');
const xml2js = require('xml2js');
const {FAC_REQUEST_HEADERS, FACServiceActions} = require('./constants');
const {buildPayload, convertOrderTotal, generateTransactionSignature} = require('./helpers');

const defaultFACConfig = Object.freeze({
    acquirerId: 123456,
    facMerchantId: 123456,
    merchantResponseURL: '',
    processingPassword: ''
})


/**
 * @class FACPaymentUtils
 * Defines a utility class that will handle everything related to payment processing using First Atlantic Commerce.
 * Functionality supported currently: Authorize & Authorize3DS
 */
class FACPaymentUtils {
    /**
     * @constructor
     * @param {object} FACConfig - Defines a configuration object for both dev and production settings.
     * @param {object} currencyConfig
     */
    constructor({FACConfig, currencyConfig}) {
        this.facConfig = FACConfig;
        this.currencyConfig = currencyConfig;
    }

    /**
     * @async
     * @method authorizeTransaction
     * @param cardInfo
     * @param merchantResponseURL
     * @param is3DSTransaction
     * @param payload
     * @param customData
     * @returns {Promise<{data: undefined, meta: undefined, success: boolean, error: string}>}
     * Handles authorizing a transaction
     */
    async authorizeTransaction({cardInfo, merchantResponseURL = '', is3DSTransaction = true, payload, customData = ''}) {

        const response = {data: undefined, error: '', meta: undefined, success: false}
        try {
            const serviceAction = is3DSTransaction ? FACServiceActions()['AUTHORIZE_3DS'] : FACServiceActions()['AUTHORIZE'];

            const headers = {...FAC_REQUEST_HEADERS};

            const orderTotal = convertOrderTotal({orderTotal: payload['orderTotal']});

            const transactionSignature = generateTransactionSignature({
                facConfig: this.facConfig,
                currencyConfig: this.currencyConfig,
                orderId: payload['orderId'],
                orderTotal
            });

            const payload = buildPayload({
                cardInfo, currencyConfig: this.currencyConfig, facConfig: this.facConfig, is3DSTransaction,
                customData, merchantResponseUrl: merchantResponseURL, transactionSignature,
                order: {orderId: payload['orderId'], orderTotal}
            });

            const {data} = await axios.post(serviceAction, payload, {headers});

            const parser = new xml2js.Parser();

            if (is3DSTransaction) {
                const {Authorize3DSResponse} = await parser.parseStringPromise(data);
                const {HTMLFormData, ResponseCode, ResponseCodeDescription} = Authorize3DSResponse;

                console.log('FACPaymentUtils.performAuthorizeTransaction parsedResponse: ', HTMLFormData['0']);

                if (ResponseCodeDescription['0'] !== 'Success') {
                    response.error = 'Failed to process your transaction';
                    return response;
                }

                response.data = HTMLFormData['0'];
                response.meta = {
                    message: 'Process transaction',
                };
                response.success = true;
            } else {
                const {AuthorizeResponse} = await parser.parseStringPromise(data);
                console.log('FACPaymentUtils.performAuthorizeTransaction AuthorizeResponse: ', AuthorizeResponse);
                const {CreditCardTransactionResults, FraudControlResults, Signature} = AuthorizeResponse;

                if (!Array.isArray(CreditCardTransactionResults) && !CreditCardTransactionResults.length) {
                    response.error = 'Transaction failed';
                    return response;
                }

                const {ReasonCode, ReasonCodeDescription, ReferenceNumber, ResponseCode} = CreditCardTransactionResults[0];

                if (ReasonCode['0'] !== '1') {
                    response.error = 'Failed to process transaction';
                    return response;
                }

                response.data = {
                    reasonCode: ReasonCode['0'],
                    responseCode: ResponseCode['0'],
                    referenceNumber: ReferenceNumber['0'],
                    reasonCodeDescription: ReasonCodeDescription['0'],
                    facTransactionSignature: Signature['0']
                }

                response.success = true;
            }

            return response;
        } catch (e) {
            response.error = e.toString();
            return response;
        }
    }
}

module.exports = FACPaymentUtils;
