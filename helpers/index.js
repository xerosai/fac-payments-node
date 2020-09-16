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
 * Created by:  xerosai @ 13/09/2020 12:37 PM
 * @author:     Simon Neufville <simon@xrscodeworks.com>
 */

const CryptoJS = require('crypto-js');
const xmlJS = require('xml-js')

/**
 * @function convertOrderTotal
 * @param {number} orderTotal
 * @returns {string|undefined}
 * Helper function that converts the order total to cents and pads the start with 0s to make it 12 characters
 */
module.exports.convertOrderTotal = ({orderTotal}) => {
    try {
        const _total = orderTotal.toFixed(2) * 100;
        return String(_total).padStart(12, '0');
    } catch (e) {
        return undefined;
    }
};

/**
 * @function generateTransactionSignature
 * @param {object} facConfig
 * @param {object} currencyConfig
 * @param {string} orderId
 * @param {string} orderTotal
 * @returns {Promise<null|*>}
 * Generates a transaction signature string for use with FAC
 */
module.exports.generateTransactionSignature = async ({facConfig, orderId, orderTotal, currencyConfig}) => {
    try {
        let signatureString = `${facConfig['processingPassword']}${facConfig['merchantId']}${facConfig['acquirerId']}${orderId}${orderTotal}${currencyConfig['currencyCode']}`;
        signatureString = await CryptoJS.SHA1(signatureString).toString();
        return Buffer.from(signatureString, 'hex').toString('bas64');
    } catch (e) {
        return null;
    }
};

/**
 * @function buildPayload
 * @param {object} cardInfo
 * @param {object} currencyConfig
 * @param {string} customData
 * @param {object} facConfig - First Atlantic config object
 * @param {boolean} is3DSTransaction - Indicates if the request to be sent will be 3D secure
 * @param {string} merchantResponseUrl - 3DS merchant response URL
 * @param {object} order
 * @param {string} transactionSignature
 * @returns {string}
 * Helper function that returns the XML payload for performing a transaction
 */
module.exports.buildPayload = ({cardInfo, currencyConfig, customData = '', facConfig, is3DSTransaction = true, merchantResponseUrl, order, transactionSignature}) => {
    const AttribsBlock = {
        _attributes: {xmlns: 'http://schemas.firstatlanticcommerce.com/gateway/data', 'xmlns:i': 'http://www.w3.org/2001/XMLSchema-instance'}
    };

    const BillingDetailsBlock = {
        BillingDetails: {
            BillToAddress: {},
            BillToAddress2: {},
            BillToCity: {},
            BillToCountry: {},
            BillToFirstName: {},
            BillToLastName: {},
            BillToState: {},
            BillToTelephone: {},
            BillToZipPostCode: {},
            BillToCounty: {},
            BillToMobile: {},
        },
    }

    const CardDetailsBlock = {
        CardDetails: {
            CardCVV2: {"_text": cardInfo['cardCVC']},
            CardExpiryDate: {"_text": String(cardInfo['cardExp']).split('/').join('')},
            CardNumber: {"_text": String(cardInfo['cardNumber']).split(' ').join('')},
            Installments: {"_text": 0}
        }
    }

    const TransactionDetailsBlock = {
        TransactionDetails: {
            AcquirerId: {"_text": facConfig['acquirerId']},
            Amount: {"_text": order['orderTotal']},
            Currency: {"_text": currencyConfig['currencyCode']},
            CurrencyExponent: {"_text": currencyConfig['exponent']},
            CustomData: {"_text": customData},
            IPAddress: {"_text": ''},
            MerchantId: {"_text": facConfig['facMerchantId']},
            OrderNumber: {"_text": String(order['orderId'])},
            Signature: {"_text": transactionSignature},
            SignatureMethod: {"_text": 'SHA1'},
            TransactionCode: {"_text": 8}
        }
    }

    const FraudDetailsBlock = {
        FraudDetails: {
            SessionId: {}
        }
    }

    const payloadObject = !is3DSTransaction ? {
        AuthorizeRequest: {
            ...AttribsBlock,
            ...BillingDetailsBlock,
            ...CardDetailsBlock,
            ...TransactionDetailsBlock,
            ...FraudDetailsBlock
        }
    } : {
        Authorize3DSRequest: {
            ...AttribsBlock,
            ...BillingDetailsBlock,
            ...CardDetailsBlock,
            ...TransactionDetailsBlock,
            MerchantResponseURL: merchantResponseUrl ? merchantResponseUrl : 'https://ecm.firstatlanticcommerce.com/TestPages/MerchantCheckout/Parser/HttpRequestParser',
            ...FraudDetailsBlock
        }
    }

    return xmlJS.js2xml(payloadObject, {compact: true, spaces: 4});
}
