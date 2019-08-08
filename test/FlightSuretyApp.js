const FlightSuretyData = artifacts.require("FlightSuretyData");
const FlightSuretyApp = artifacts.require("FlightSuretyApp");

contract("Flight Surety App Tests", async accounts => {
    let helper = require("./TestConstants")(accounts, web3);
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

        // describe("Failure cases", async function () {
        //     it("Can not create insurance for inexistent flight", async function () {
        //         try {
        //             await flightSuretyAppContract.buyInsurance(20, { from: helper.whomever, value: helper.toWei(0.75) });
        //             assert.fail('Expected an exception');
        //         } catch (error) {
        //         }
        //     });

        //     it("Can not create insurance paying nothing", async function () {
        //         try {
        //             await flightSuretyAppContract.buyInsurance(20, { from: helper.whomever, value: helper.toWei(0) });
        //             assert.fail('Expected an exception');
        //         } catch (error) {
        //         }
        //     });
        // });
    });

    // describe("Contract.isOperational/ setOperatingStatus", async function(){
    //     it("Everybody can get operational status without access restrictions", async function () {
    //         let status = await flightSuretyAppContract.isOperational({from: helper.whomever});
    //         assert.equal(status, true, "Unexpected operational status");
    //     });
    //     // it("Everybody can get operational status even when contract is not operational", async function () {
    //     //     await flightSuretyAppContract.setOperatingStatus(false, {from: helper.contractOwner});
    //     //     let status = await flightSuretyAppContract.isOperational({from: helper.whomever});
    //     //     assert.equal(status, false, "Unexpected operational status");
    //     // });
    //     it("Only contract owner can set operational status", async function () {
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.setOperatingStatus,
    //             [false, {from: helper.whomever}],
    //             helper.ERROR.CALLER_NOT_CONTRACT_OWNER
    //         )
    //     });
    // });

    // describe("Airlines.registerAirline/ getAirline. No consensus required before 4 airlines are registered", async function(){
    //     it("Airline can not be registered when the contract is not operational", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: helper.contractOwner});
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.registerAirline,
    //             [helper.secondAirline, {from: helper.firstAirline}],
    //             helper.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Airline can not be registered when the caller is not registered airline", async function () {
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.registerAirline,
    //             [helper.secondAirline, {from: helper.secondAirline}],
    //             'The sender is not an Airline operator'
    //         )
    //     });
    //     it("Airline can be registered, when the contract is operational and the caller is registered airline", async function () {
    //         await flightSuretyAppContract.registerAirline(
    //             helper.secondAirline, {from: helper.firstAirline}
    //         );
    //         let airline = await flightSuretyAppContract.getAirline(helper.secondAirline);
    //         helper.assertAirline(
    //             {
    //                 id: 2,
    //             },
    //             airline
    //         );
    //     });
    // });

    // describe("Contract.payRegistrationFee", async function(){
    //     beforeEach(async () =>{
    //         console.log("    Log: Second Airline Registered");
    //         await flightSuretyAppContract.registerAirline(
    //             helper.secondAirline, {from: helper.firstAirline}
    //         );
    //     });
    //     it("Registration fee can not be paid when the contract is not operational ", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: helper.contractOwner});
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.payRegistrationFee,
    //             // [helper.registrationFee, {from: helper.secondAirline, value: helper.registrationFee}],
    //             [{from: helper.secondAirline, value: helper.registrationFee}],
    //             helper.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Registration fee can not be paid when the caller is not registered airline", async function () {
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.payRegistrationFee,
    //             // [helper.registrationFee, {from: helper.fifthAirline, value: helper.registrationFee}],
    //             [{from: helper.secondAirline, value: helper.registrationFee}],
    //             helper.ERROR.AIRLINE_NOT_EXIST
    //         )
    //     });
    //     it("Registration fee can not be paid when the fee is < required", async function () {
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.payRegistrationFee,
    //             // [helper.lessThatRegistrationFee, {from: helper.secondAirline, value: helper.lessThatRegistrationFee}],
    //             [{from: helper.secondAirline, value: helper.registrationFee}],
    //             helper.ERROR.NOT_ENOUGH_VALUE
    //         )
    //     });
    //     it("Registration fee can be paid when the contract is operational, the caller is registered airline and the fee is >= required", async function () {
    //         flightSuretyDataContract.FundsAdded().on("data", event => {
    //             assert.equal(event.returnValues.contractAddress, flightSuretyDataContract.address, "Unexpected contract address");
    //         });
    //         flightSuretyAppContract.RegistrationFeePaid().on("data", event => {
    //             assert.equal(event.returnValues.airlineAddress, helper.secondAirline, "Unexpected airline address");
    //         });
    //         let dataContractBalanceBefore = await helper.currentBalanceAsBN(flightSuretyDataContract.address);
    //         await flightSuretyAppContract.payRegistrationFee(
    //             // helper.registrationFee, {from: helper.secondAirline, value: helper.registrationFee}
    //             {from: helper.secondAirline, value: helper.registrationFee}
    //         );
    //         let dataContractBalanceAfter = await helper.currentBalanceAsBN(flightSuretyDataContract.address);
    //         assert.equal(dataContractBalanceBefore.add(helper.toBN(helper.registrationFee)).eq(dataContractBalanceAfter), true, "Unexpected data contract balance");
    //     });
    // });

    // describe("Airlines.registerAirline/ getAirline. Consensus required after 4 airlines are registered", async function(){
    //     beforeEach(async()=>{
    //         console.log("    Log: 4 Airlines registered and 3 paid registration fee.");
    //         let addresses = [helper.secondAirline, helper.thirdAirline, helper.fourthAirline];
    //         addresses.forEach(async (address, index) => {
    //             await flightSuretyAppContract.registerAirline(address, {from: helper.firstAirline});
    //             if(index !== 2) {
    //                 await flightSuretyAppContract.payRegistrationFee({from: address, value: helper.registrationFee});
    //             }
    //         });
    //     });
    //     it("Vote can not be counted when the caller did not pay registration fee", async function () {
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.registerAirline,
    //             [helper.fifthAirline, {from: helper.fourthAirline}],
    //             helper.ERROR.REG_FEE_NOT_PAID
    //         )
    //     });
    //     it("Vote can not be counted when the caller has already voted", async function () {
    //         await flightSuretyAppContract.registerAirline(
    //             helper.fifthAirline, {from: helper.firstAirline}
    //         );
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.registerAirline,
    //             [helper.fifthAirline, {from: helper.firstAirline}],
    //             helper.ERROR.HAS_ALREADY_VOTED
    //         )
    //     });
    //     it("Vote can be counted, when the caller paid registration fee and had not voted before.", async function () {
    //         flightSuretyAppContract.VoteCounted().on("data", event => {
    //             assert.equal(event.returnValues.isConsensusReached, false, "Unexpected consensus status afte the vote");
    //             assert.equal(event.returnValues.voteCount, 1, "Unexpected vote count");
    //             assert.equal(event.returnValues.totalCount, 4, "Unexpected total voters count");
    //         });
    //         await flightSuretyAppContract.registerAirline(
    //             helper.fifthAirline, {from: helper.firstAirline}
    //         );
    //     });
    //     it("Airline can be registered when number of votes is >= consensus", async function () {
    //         let voteCount = 0;
    //         flightSuretyAppContract.VoteCounted().on("data", event => {
    //             voteCount++;
    //             if(voteCount === 2){
    //                 assert.equal(event.returnValues.isConsensusReached, true, "Unexpected consensus status after the vote");
    //                 assert.equal(event.returnValues.voteCount, 2, "Unexpected vote count");
    //                 assert.equal(event.returnValues.totalCount, 5, "Unexpected total voters count");
    //             }
    //         });
    //         await flightSuretyAppContract.registerAirline(
    //             helper.fifthAirline, {from: helper.firstAirline}
    //         );
    //         await flightSuretyAppContract.registerAirline(
    //             helper.fifthAirline, {from: helper.secondAirline}
    //         );
    //     });
    // });

    // describe("Insurances.setInsurancePremiumMultiplier/ getInsurancePremiumMultiplier", async function(){
    //     it("Insurance premium multiplier can not be set when the contract is not operational ", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: helper.contractOwner});
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.setInsurancePremiumMultiplier,
    //             [helper.insurancePremiumMultiplier.numerator, helper.insurancePremiumMultiplier.denominator, {from: helper.contractOwner}],
    //             helper.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Insurance premium multiplier can not be set when the caller is not contract owner", async function () {
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.setInsurancePremiumMultiplier,
    //             [helper.insurancePremiumMultiplier.numerator, helper.insurancePremiumMultiplier.denominator, {from: helper.whomever}],
    //             helper.ERROR.CALLER_NOT_CONTRACT_OWNER
    //         )
    //     });

    //     it("Insurance premium multiplier can not be read when the contract is not operational", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: helper.contractOwner});
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.getInsurancePremiumMultiplier,
    //             [{from: helper.whomever}],
    //             helper.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Insurance premium multiplier can be set when the contract is operational, the caller is contract owner", async function () {
    //         await flightSuretyAppContract.setInsurancePremiumMultiplier(helper.insurancePremiumMultiplier.numerator, helper.insurancePremiumMultiplier.denominator, {from: helper.contractOwner});
    //         let response = await flightSuretyAppContract.getInsurancePremiumMultiplier({from: helper.whomever});
    //         assert.equal(response.numerator, helper.insurancePremiumMultiplier.numerator, "Unexpected insurance premium numerator");
    //         assert.equal(response.denominator, helper.insurancePremiumMultiplier.denominator, "Unexpected insurance premium  denominator");
    //     });
    // });

    // describe("Flights.registerFlight/ getFlight", async function(){
    //     it("Flight can not be registered when the contract is not operational", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: helper.contractOwner});
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.registerFlight,
    //             [helper.flightOne.flight, helper.flightOne.departure, helper.firstAirline, {from: helper.firstAirline}],
    //             helper.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Flight can be registered when the contract is operational", async function () {
    //         await flightSuretyAppContract.registerFlight(
    //             helper.flightOne.flight, helper.flightOne.departure, helper.firstAirline, {from: helper.firstAirline},
    //         );
    //         let flight = await flightSuretyAppContract.getFlight(1);
    //         let key = await flightSuretyDataContract.createFlightKey(helper.firstAirline, helper.flightOne.flight, helper.flightOne.departure, {from: helper.whomever});
    //         helper.assertFlight(
    //             {
    //                 id: 1,
    //                 flight: helper.flightOne.flight,
    //                 key: key,
    //                 airline: helper.firstAirline,
    //                 departure: helper.flightOne.departure,
    //                 departureStatusCode: helper.FLIGHT_STATUS_CODE.UNKNOWN,
    //                 state: helper.FLIGHT_STATE.AVAILABLE
    //             },
    //             flight
    //         );
    //     });
    // });


    // describe("Insurances.buyInsurance/ getInsurance", async function(){
    //     beforeEach(async ()=>{
    //         console.log("    Log: flight created");
    //         await flightSuretyAppContract.registerFlight(
    //             helper.flightOne.flight, helper.flightOne.departure, helper.firstAirline, {from: helper.firstAirline}
    //             );
    //     });
    //     it("Insurance can not be bought when the contract is not operational", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: helper.contractOwner});
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.buyInsurance,
    //             [helper.insuranceOne.flightId, helper.insuranceOne.paid, {from: helper.insuranceOne.passenger, value: helper.insuranceOne.paid}],
    //             helper.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Insurance can not be bought when the amount paid is > insurance cap", async function () {
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.buyInsurance,
    //             [helper.insuranceThatExceedCap.flightId, helper.insuranceThatExceedCap.paid, {from: helper.insuranceThatExceedCap.passenger, value: helper.insuranceThatExceedCap.paid}],
    //             helper.ERROR.EXCEED_CAP
    //         )
    //     });
    //     it("Insurance can be bought when the contract is operational, the amount paid is <= insurance cap", async function () {
    //         await flightSuretyAppContract.buyInsurance(
    //             helper.insuranceOne.flightId, helper.insuranceOne.paid, {from: helper.insuranceOne.passenger, value: helper.insuranceOne.paid}
    //         );
    //         let insurance = await flightSuretyAppContract.getInsurance(1);
    //         helper.assertInsurance(
    //             {
    //                 id: 1,
    //                 flightId: helper.insuranceOne.flightId,
    //                 amountPaid: helper.insuranceOne.paid,
    //                 owner: helper.insuranceOne.passenger,
    //                 state: helper.INSURANCE_STATE.ACTIVE
    //             },
    //             insurance
    //         )
    //     });
    //     it("Insurance can not be read when the contract is not operational", async function () {
    //         await flightSuretyAppContract.buyInsurance(
    //             helper.insuranceOne.flightId, helper.insuranceOne.paid, {from: helper.insuranceOne.passenger, value: helper.insuranceOne.paid}
    //         );
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: helper.contractOwner});
    //         await helper.asyncTestForError(
    //             flightSuretyAppContract.getInsurance,
    //             [1, {from: helper.insuranceOne.passenger}],
    //             helper.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    // });



    // describe("Flights.processFlightStatus", async function(){
    //     beforeEach(async ()=>{
    //         console.log("    Log: Flight Registered");
    //         await flightSuretyAppContract.registerFlight(
    //             helper.flightOne.flight, helper.flightOne.departure, helper.firstAirline, {from: helper.firstAirline},
    //         );
    //         console.log("    Log: Insurances for Flight Bought");
    //         [helper.insuranceOne, helper.insuranceFour].forEach(async insurance => {
    //             await flightSuretyAppContract.buyInsurance(
    //                 insurance.flightId, insurance.paid, {from: insurance.passenger, value: insurance.paid}
    //             );
    //         });
    //     });
    //     it("Flight Status Information can be processed when the contract is operational", async function () {
    //         let insuranceCreditCount = 0;
    //         flightSuretyDataContract.InsuranceCredited().on("data", async event => {
    //             insuranceCreditCount++;
    //             if(insuranceCreditCount === 2) {
    //                 let actualP1Credit = await flightSuretyDataContract.getCreditedAmount(helper.insuranceOne.passenger);
    //                 let actualP4Credit = await flightSuretyDataContract.getCreditedAmount(helper.insuranceFour.passenger);
    //                 let k = await flightSuretyAppContract.getInsurancePremiumMultiplier();
    //                 let expectedP1Credit = helper.toBN(helper.insuranceOne.paid).mul(k.numerator).div(k.denominator);
    //                 let expectedP4Credit = helper.toBN(helper.insuranceFour.paid).mul(k.numerator).div(k.denominator);
    //                 assert.equal(actualP1Credit.eq(expectedP1Credit), true, "Unexpected credit for passenger one");
    //                 assert.equal(actualP4Credit.eq(expectedP4Credit), true, "Unexpected credit for passenger four");
    //             }
    //         });
    //         await flightSuretyAppContract.processFlightStatus(
    //             helper.firstAirline,
    //             helper.flightOne.flight,
    //             helper.flightOne.departure,
    //             helper.FLIGHT_STATUS_CODE.LATE_AIRLINE,
    //             {from: helper.whomever}
    //         );
    //     });

    // });

    // describe("fetchFlightStatus", async function(){

    // });
});