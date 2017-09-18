var bidfactory = require('src/bidfactory.js');
var bidmanager = require('src/bidmanager.js');
var ajaxHelper = require('src/ajax.js');
var adaptermanager = require('src/adaptermanager');

var CriteoAdapter = function CriteoAdapter() {
  var _bidderCode = 'criteo';
  var _cdb_endPoint = '//bidder.criteo.com/cdb';
  var _profileId = 207;

  function _callBids(params) {
    var url = _buildCDBUrl();
    var dataWrapper = _buildCDBData(params);

    var stringifiedData = JSON.stringify(dataWrapper.data);

    var xhrOptions = {
      metthod: 'POST',
      contentType: 'application/x-www-form-urlencoded',
      withCredentials: true
    }

    ajaxHelper.ajax(url, _callbackCDBResponse(dataWrapper.slotsBidMapping), stringifiedData, xhrOptions);
  }

  function _buildCDBUrl() {
    var protocol = location.protocol === 'https:' ? 'https:' : 'http:';
    var profileId = '?profileId=' + _profileId;
    var cb = '&cb=' + String(_generateCacheBuster());

    var url = protocol + _cdb_endPoint + profileId + cb;
    return url;
  }

  function _buildCDBData(params) {
    var publisher = {
      'url': location.href
    }

    var slots = [];
    var slotsBidMapping = []

    params.bids.forEach((bid) => {
      var requestSlot = {
        impid: bid.placementCode,
        zoneid: bid.params.zoneId,
        transactionid: bid.transactionId
      };
      slots.push(requestSlot);
      slotsBidMapping.push({ slot: requestSlot, bid: bid })
    });

    var data = {
      publisher: publisher,
      slots: slots
    }

    return {
      data: data,
      slotsBidMapping: slotsBidMapping
    }
  }

  function _generateCacheBuster() {
    return Math.floor(Math.random() * 99999999999);
  }

  function parseBidResponse(bidsResponse) {
    try {
      return JSON.parse(bidsResponse);
    } catch (error) {
      return {};
    }
  }

  function isNoBidResponse(jsonbidsResponse) {
    return jsonbidsResponse.slots === undefined;
  }

  function _callbackCDBResponse(requestSlotsBidMapping) {
    return function (bidsResponse) {
      var jsonbidsResponse = parseBidResponse(bidsResponse);

      if (isNoBidResponse(jsonbidsResponse)) { return _callbackError(requestSlotsBidMapping)(); }

      requestSlotsBidMapping.forEach((requestSlotBidMapping) => {
        var bidResponse = null;
        var requestSlot = requestSlotBidMapping.slot;
        var requestBid = requestSlotBidMapping.bid;

        jsonbidsResponse.slots.forEach((responseSlot) => {
          if (responseSlot.impid === requestSlot.impid && responseSlot.zoneid == requestSlot.zoneid) {
            bidResponse = responseSlot;
          };
        });

        var bidObject;
        if (bidResponse) {
          bidObject = bidfactory.createBid(1, requestBid);
          bidObject.bidderCode = _bidderCode;
          bidObject.cpm = bidResponse.cpm;
          bidObject.ad = bidResponse.creative;
          bidObject.width = bidResponse.width;
          bidObject.height = bidResponse.height;
        } else {
          bidObject = _invalidBidResponse(requestBid);
        }
        bidmanager.addBidResponse(requestSlot.impid, bidObject);
      });
    };
  }

  function _callbackError(requestSlotsBidMapping) {
    return function () {
      requestSlotsBidMapping.forEach((bidMapping) => {
        var requestSlot = bidMapping.slot;
        var requestBid = bidMapping.bid;
        bidmanager.addBidResponse(requestSlot.impid, _invalidBidResponse(requestBid));
      });
    };
  }

  function _invalidBidResponse(requestBid) {
    var bidObject = bidfactory.createBid(2, requestBid);
    bidObject.bidderCode = _bidderCode;
    return bidObject;
  }

  return {
    callBids: _callBids
  };
};

adaptermanager.registerBidAdapter(new CriteoAdapter(), 'criteo');

module.exports = CriteoAdapter;
