/* jshint -W030 */

import Adapter from '../../../src/adapters/criteo';
import bidManager from '../../../src/bidmanager';
import {expect} from 'chai';

describe('criteo adapter test', () => {

  let adapter;
  let stubAddBidResponse;

  let validBid = {
        bidderCode: 'criteo',
        bids: [
          {
            bidder: 'criteo',
            placementCode: 'foo',
            sizes: [[250, 350]],
            params: {
                zoneid: 'bar',
                audit: 'true'
            }
          }
        ]
   };

  beforeEach(() => {
    adapter = new Adapter();
  });

  afterEach(() => {
    stubAddBidResponse.restore();
  });

  describe('adding bids to the manager', () => {

    it('adds bid for valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.satisfy(bid => { return bid.getStatusCode() == 1; }) // Status 1 = Bid available
          done();
      });

      adapter.callBids(validBid);
    });

    it('adds bidderCode to the response of a valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
          expect(bid).to.have.property('bidderCode', 'criteo');
          done();
      });

      adapter.callBids(validBid);
    });

    it('adds cpm to the response of a valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
        expect(bid).to.have.property('cpm', 1.12);
        done();
      });
      adapter.callBids(validBid);
    });

    it('adds creative to the response of a valid request', (done) => {
      stubAddBidResponse = sinon.stub(bidManager, 'addBidResponse', function (adUnitCode, bid) {
        expect(bid).to.have.property('ad', '<html><h3>I am an ad</h3></html>');
        done();
      });
      adapter.callBids(validBid);
    });
  });

});
