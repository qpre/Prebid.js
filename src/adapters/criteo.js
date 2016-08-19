var bidfactory = require('../bidfactory.js');
var bidmanager = require('../bidmanager.js');
var adloader = require('../adloader');

var CriteoAdapter = function CriteoAdapter() {

  var _publisherTagUrl = window.location.protocol + '//static.criteo.net/js/ld/publishertag.js';
  var _bidderCode = 'criteo';
  var _profileId = 125;

  function _callBids(params) {
    if (!window.criteo_pubtag || window.criteo_pubtag instanceof Array) {
      // publisherTag not loaded yet
      adloader.loadScript(
        _publisherTagUrl,
        function () {
          _sendBidRequest(params);
        },
        true
      );
    }
    else {
      // publisherTag already loaded
      _sendBidRequest(params);
    }
  }

  // send bid request to criteo direct bidder handler
  function _sendBidRequest(params) {
    var bids = params.bids || [];

    var slots = [];

    var isAudit = false;

    // build slots before sendind one multi-slots bid request
    for (var i = 0; i < bids.length; i++) {
      var bid = bids[i];
      slots.push(
        new Criteo.PubTag.DirectBidding.DirectBiddingSlot(
          bid.placementCode,
          bid.params.zoneid
        )
      );

      isAudit |= bid.params.audit !== undefined;
    }

    // generate the bidding event
    var biddingEvent = new Criteo.PubTag.DirectBidding.DirectBiddingEvent(
      _profileId,
      new Criteo.PubTag.DirectBidding.DirectBiddingUrlBuilder(isAudit),
      slots,
      _callbackSuccess(slots),
      _callbackError(slots),
      _callbackError(slots) // timeout handled as error
    );

    // if we want to be fully asynchrone, we must first check window.criteo_pubtag in case publishertag.js is not loaded yet.
    window.criteo_pubtag = window.criteo_pubtag || [];
    // process the event as soon as possible
    window.criteo_pubtag.push(biddingEvent);
  }

  function _callbackSuccess(slots) {
    return function (bidsResponse) {
      var jsonbidsResponse = JSON.parse(bidsResponse);
      for(var i = 0; i < slots.length; i++) {
        var bidResponse = null;

        // look for the matching bid response
        for(var j = 0; j < jsonbidsResponse.slots.length; j++) {
          if (jsonbidsResponse.slots[j] && jsonbidsResponse.slots[j].impid === slots[i].impId) {
            bidResponse = jsonbidsResponse.slots[j];
            break;
          }
        }

        // register the bid response
        var bidObject;
        if (bidResponse) {
          bidObject = bidfactory.createBid(1);
          bidObject.bidderCode = _bidderCode;
          bidObject.cpm = bidResponse.cpm;
          bidObject.ad = bidResponse.creative;
          bidObject.width = bidResponse.width;
          bidObject.height = bidResponse.height;
        }
        else {
          bidObject = _invalidBidResponse();
        }
        bidmanager.addBidResponse(slots[i].impid, bidObject);
      }
    };
  }

  function _callbackError(slots) {
    return function () {
      for(var i = 0; i < slots.length; i++) {
        bidmanager.addBidResponse(slots[i].ImpId, _invalidBidResponse());
      }
    };
  }

  function _invalidBidResponse() {
    var bidObject = bidfactory.createBid(2);
    bidObject.bidderCode = _bidderCode;
    return bidObject;
  }

  return {
    callBids: _callBids
  };
};

module.exports = CriteoAdapter;