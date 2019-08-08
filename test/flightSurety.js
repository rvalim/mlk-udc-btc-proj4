const FlightSuretyData = artifacts.require("FlightSuretyData");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");

contract("Flight Surety App Tests", async accounts => {
    let helper = require("./helper")(accounts, web3);
    let flightSuretyDataContract, flightSuretyAppContract;

    beforeEach(async () => {
        flightSuretyDataContract = await FlightSuretyData.new(
            { from: helper.contractOwner, value: helper.toWei(10) }
        );
        flightSuretyAppContract = await FlightSuretyApp.new(
            flightSuretyDataContract.address,
            { from: helper.contractOwner }
        );
        await flightSuretyDataContract.setAuthorizedCaller(flightSuretyAppContract.address, true, { from: helper.contractOwner });
    });

    describe("About Airlines", async function () {
        describe("Success cases", async function () {

            it("Can register airline", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
            });

            it("Can make the first Deposit", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.depositFundToOperate({ from: helper.secondAirline, value: helper.toWei(10) });
            });

            it("Can register four airlines without voting", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.thirdAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fourthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fifthAirline, { from: helper.contractOwner });

                const a1 = (await flightSuretyAppContract.getAirline(helper.contractOwner)).isAccepted;
                const a2 = (await flightSuretyAppContract.getAirline(helper.secondAirline)).isAccepted;
                const a3 = (await flightSuretyAppContract.getAirline(helper.thirdAirline)).isAccepted;
                const a4 = (await flightSuretyAppContract.getAirline(helper.fourthAirline)).isAccepted;
                const a5 = (await flightSuretyAppContract.getAirline(helper.fifthAirline)).isAccepted;

                assert.equal(a1, true, "The contract owner should have been accepted");
                assert.equal(a2, true, "The secondAirline should have been accepted");
                assert.equal(a3, true, "The thirdAirline should have been accepted");
                assert.equal(a4, true, "The fourthAirline should have been accepted");
                assert.equal(a5, false, "The fifthAirline should NOT have been accepted");
            });

            it("The fifth can be accepted by the network", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.thirdAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fourthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fifthAirline, { from: helper.contractOwner });

                await flightSuretyAppContract.depositFundToOperate({ from: helper.secondAirline, value: helper.toWei(10) });
                await flightSuretyAppContract.depositFundToOperate({ from: helper.thirdAirline, value: helper.toWei(10) });
                await flightSuretyAppContract.depositFundToOperate({ from: helper.fourthAirline, value: helper.toWei(10) });


                const a5_before = (await flightSuretyAppContract.getAirline(helper.fifthAirline)).isAccepted;

                await flightSuretyAppContract.voteToFly(helper.fifthAirline, { from: helper.secondAirline });

                try {
                    await flightSuretyAppContract.voteToFly(helper.fifthAirline, { from: helper.fourthAirline });
                    assert.fail('Expected throw not received, considering the 5th airline imputed to be accepted by the half of it, 2');
                } catch (error) {
                }

                const a5_after = (await flightSuretyAppContract.getAirline(helper.fifthAirline)).isAccepted;

                assert.equal(a5_before, false, "The fifthAirline should NOT have been accepted");
                assert.equal(a5_after, true, "The fifthAirline SHOULD have been accepted");
            });
            it("Can create a flight", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.depositFundToOperate({ from: helper.secondAirline, value: helper.toWei(10) });
                let parameters = [helper.flightOne.flight, helper.flightOne.departure, { from: helper.secondAirline }];
                let parameters1 = [helper.flightOne.flight, helper.flightOne.departure, helper.secondAirline];
                await flightSuretyAppContract.registerFlight(...parameters);
                let id = await flightSuretyAppContract.getFlightId(...parameters1);
                assert.equal(id > 0, true, "Flight created");
            });

            it("Can retrieve the information", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.depositFundToOperate({ from: helper.secondAirline, value: helper.toWei(10) });
                let parameters = [helper.flightOne.flight, helper.flightOne.departure, { from: helper.secondAirline }];
                let parameters1 = [helper.flightOne.flight, helper.flightOne.departure, helper.secondAirline];
                await flightSuretyAppContract.registerFlight(...parameters);

                let key = await flightSuretyDataContract.getFlightKey(...parameters1);
                let id = await flightSuretyAppContract.getFlightId(...parameters1);
                let flight = await flightSuretyAppContract.getFlight(id);

                assert.equal(flight.key, key, "Invalid flight key");
                assert.equal(flight.airlineAddress, helper.secondAirline, "Wrong airline address")
                assert.equal(flight.flightCode, helper.flightOne.flight, "Invalid flight code")
                assert.equal(flight.departureTimestamp, helper.flightOne.departure, "Flight created")
            });
        });

        describe("Failure cases", async function () {

            it("Can not create an airlane without been one", async function () {
                try {
                    await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.thirdAirline });
                    assert.fail('Exception expected, thirdAirline was not registered');
                } catch (error) {

                }
            });

            it("Can not create an airlane without paying the fee", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });

                try {
                    await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.secondAirline });
                    assert.fail('Exception expected, secondAirline has payed the fee');
                } catch (error) {
                }
            });

            it("Can not create an airlane without been accepted by the network", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.thirdAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fourthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fifthAirline, { from: helper.contractOwner });

                try {
                    await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.fifthAirline });
                    assert.fail('Exception expected, fifthAirline was not accepted by the network');
                } catch (error) {
                }
            });

            it("Can not pay the fee before network acceptance", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.thirdAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fourthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fifthAirline, { from: helper.contractOwner });

                try {
                    await flightSuretyAppContract.depositFundToOperate({ from: helper.fifthAirline, value: helper.toWei(10) });
                    assert.fail('Exception expected, fifthAirline was not accepted by the network');
                } catch (error) {

                }
            });

            it("Can not vote for an airline without paying the fee", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.thirdAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fourthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fifthAirline, { from: helper.contractOwner });

                try {
                    await flightSuretyAppContract.voteToFly(helper.fifthAirline, { from: helper.secondAirline });
                    assert.fail('Exception expected, secondAirline needs to pay the fee');
                } catch (error) {

                }
            });

            it("Can not vote for an airline without been accepted by the network", async function () {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.thirdAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fourthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fifthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.sixthAirline, { from: helper.contractOwner });

                try {
                    await flightSuretyAppContract.voteToFly(helper.sixthAirline, { from: helper.fifthAirline });
                    assert.fail('Exception expected, fifthAirline to be accepted and pay the fee');
                } catch (error) {

                }
            });

        });
    });

    describe("About Flights", async function () {

        beforeEach(async () => {
            // //Creating 2 Airline
            try {
                await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.depositFundToOperate({ from: helper.secondAirline, value: helper.toWei(10) });

            } catch (error) {
                console.log(error)
            }
        });

        describe("Success cases", async function () {
            let parameters = [helper.flightOne.flight, helper.flightOne.departure, { from: helper.secondAirline }];
            let parameters1 = [helper.flightOne.flight, helper.flightOne.departure, helper.secondAirline];

            it("Can create a flight", async function () {
                await flightSuretyAppContract.registerFlight(...parameters);
                let id = await flightSuretyAppContract.getFlightId(...parameters1);
                assert.equal(id > 0, true, "Flight created");
            });

            it("Can retrieve the information", async function () {
                await flightSuretyAppContract.registerFlight(...parameters);

                let key = await flightSuretyDataContract.getFlightKey(...parameters1);
                let id = await flightSuretyAppContract.getFlightId(...parameters1);
                let flight = await flightSuretyAppContract.getFlight(id);

                assert.equal(flight.key, key, "Invalid flight key");
                assert.equal(flight.airlineAddress, helper.secondAirline, "Wrong airline address")
                assert.equal(flight.flightCode, helper.flightOne.flight, "Invalid flight code")
                assert.equal(flight.departureTimestamp, helper.flightOne.departure, "Flight created")
            });
        });

        describe("Failure cases", async function () {
            it("Can not create flight for inexistent airline company", async function () {

                let parameters = [helper.flightOne.flight, helper.flightOne.departure, { from: helper.thirdAirline }];
                try {
                    await flightSuretyAppContract.registerFlight(...parameters);
                    assert.equal(true, "This company could not create flight");
                } catch (e) {
                }
            });

            it("Can not create flight a non accepted airline", async function () {
                await flightSuretyAppContract.registerAirline(helper.fourthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.fifthAirline, { from: helper.contractOwner });
                await flightSuretyAppContract.registerAirline(helper.sixthAirline, { from: helper.contractOwner });

                let parameters = [helper.flightOne.flight, helper.flightOne.departure, { from: helper.sixthAirline }];

                try {
                    await flightSuretyAppContract.registerFlight(...parameters);
                    assert.equal(true, "This company could not create flight");
                } catch (e) {
                }
            });

            it("Can not create flight by an accepted airline that do not pay the register fee", async function () {
                await flightSuretyAppContract.registerAirline(helper.thirdAirline, { from: helper.contractOwner });

                let parameters = [helper.flightOne.flight, helper.flightOne.departure, { from: helper.thirdAirline }];

                try {
                    await flightSuretyAppContract.registerFlight(...parameters);
                    assert.equal(true, "This company could not create flight");
                } catch (e) {
                }
            });
        });
    });

    describe("About Insurances", async function () {
        let flightId = 0;


        beforeEach(async () => {
            let parameters = [helper.flightOne.flight, helper.flightOne.departure, { from: helper.secondAirline }];
            let parameters1 = [helper.flightOne.flight, helper.flightOne.departure, helper.secondAirline];
            // //Creating 2 Airline
            await flightSuretyAppContract.registerAirline(helper.secondAirline, { from: helper.contractOwner });
            await flightSuretyAppContract.depositFundToOperate({ from: helper.secondAirline, value: helper.toWei(10) });
            await flightSuretyAppContract.registerFlight(...parameters);
            flightId = await flightSuretyAppContract.getFlightId(...parameters1);

        });

        describe("Success cases", async function () {
            it("Can create insurance", async function () {
                flightSuretyDataContract.NewInsuranceAdded().on("data", async event => {
                    flightId = helper.toBN(flightId);

                    assert.equal(event.returnValues.fligthId, flightId, "Wrong flight Id");
                    assert.equal(event.returnValues.owner, helper.whomever, "Wrong owner");

                    const insurance = await flightSuretyAppContract.getInsurance(event.returnValues.id, { from: helper.whomever });
                    assert.equal(insurance.state, helper.insuranceState.Sleeping, "Incorrect initial state");
                }, {flightId});

                await flightSuretyAppContract.buyInsurance(flightId, { from: helper.whomever, value: helper.toWei(1) });
            });


            it("Can create insurance paying less than 1 ether", async function () {

                flightSuretyDataContract.NewInsuranceAdded().on("data", async event => {
                    flightId = helper.toBN(flightId);

                    assert.equal(event.returnValues.fligthId, flightId, "Wrong flight Id");
                    assert.equal(event.returnValues.owner, helper.whomever, "Wrong owner");

                    const insurance = await flightSuretyAppContract.getInsurance(event.returnValues.id, { from: helper.whomever });
                    assert.equal(insurance.state, helper.insuranceState.Sleeping, "Incorrect initial state");
                }, {flightId});

                await flightSuretyAppContract.buyInsurance(flightId, { from: helper.whomever, value: helper.toWei(0.75) });
            });
        });
    });

});