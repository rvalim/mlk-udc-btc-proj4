module.exports = function (accounts, web3){
    var result = {
            contractOwner: accounts[0],
            firstAirline: accounts[0],
            secondAirline: accounts[1],
            thirdAirline: accounts[2],
            fourthAirline: accounts[3],
            fifthAirline: accounts[4],
            sixthAirline: accounts[5],
            veryRichGuy: accounts[6],
            notRegisteredAirline: accounts[9],
            whomever: accounts[9],
            registrationFee:  web3.utils.toWei("10", "ether"),
            flightOne: {
                flight: "SU 1925",
                departure: (Math.ceil(new Date().valueOf()/1000)) + 24*60*60
            },
            flightTwo: {
                flight: "SU 2567",
                departure: (Math.ceil(new Date().valueOf()/1000)) + 23*60*60
            },
            flightThatHasDeparted: {
                flight: "SU 1925",
                departure: (Math.ceil(new Date().valueOf()/1000)) - 2*60*60
            },
            insuranceState: {
                Sleeping: 'Sleeping',
                Expired: 'Expired',
                Credited: 'Credited'
            },
            toWei: function(value){
                return web3.utils.toWei(value.toString(), "ether");
            },
            toBN: function(str){
                return web3.utils.toBN(str);
            }
        }

    return result;
};