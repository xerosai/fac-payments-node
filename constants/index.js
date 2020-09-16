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
 * Created by:  xerosai @ 13/09/2020 12:58 PM
 * @author:     Simon Neufville <simon@xrscodeworks.com>
 */

/**
 * @const FAC_BASE_URLS
 * @type {Readonly<{DEV: string, LIVE: string}>}
 * Define First Atlantic Commerce base urls
 */
const FAC_BASE_URLS = Object.freeze({
    DEV: 'https://ecm.firstatlanticcommerce.com/PGServiceXML',
    LIVE: 'https://marlin.firstatlanticcommerce.com/PGServiceXML'
});

/**
 * @const FAC_REQUEST_HEADERS
 * @type {Readonly<{"Content-Type": string}>}
 * Defines request headers
 */
module.exports.FAC_REQUEST_HEADERS = Object.freeze({
    'Content-Type': 'application/x-www-form-urlencoded'
});

/**
 * @function FACServiceActions
 * @returns {Readonly<{AUTHORIZE: string, AUTHORIZE_3DS: string}>}
 * @constructor
 */
module.exports.FACServiceActions = () => {

    const BaseURL = process.env.NODE_ENV === 'production' ? FAC_BASE_URLS.LIVE : FAC_BASE_URLS.DEV;

    return Object.freeze({
        AUTHORIZE: `${BaseURL}/Authorize`,
        AUTHORIZE_3DS: `${BaseURL}/Authorize3DS`
    });
};
