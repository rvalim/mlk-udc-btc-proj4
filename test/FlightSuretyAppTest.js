const FlightSuretyData  = artifacts.require("FlightSuretyData");
const FlightSuretyApp  = artifacts.require("FlightSuretyApp");

contract("Flight Surety Data Unit Tests", async accounts => {
    let TEST;
    try {
        TEST = require("./TestConstants")(accounts, web3);
    } catch (e) {
        console.log(`TEST setup failed\n${e.message}`);
    }


    let flightSuretyDataContract, flightSuretyAppContract;

    beforeEach(async () => {
        console.log("        Log:FlightSuretyData is re-instantiated");
        flightSuretyDataContract = await FlightSuretyData.new(
            {from: TEST.contractOwner, value: web3.utils.toWei("10", "ether")}
        );
        flightSuretyAppContract = await FlightSuretyApp.new(
            flightSuretyDataContract.address,
            {from: TEST.contractOwner}
        );
        try {
            await flightSuretyDataContract.setAuthorizedCaller(flightSuretyAppContract.address, true, {from: TEST.contractOwner});
        } catch (e) {
            console.log(e);
        }
    });
    describe("Contract.isOperational/ setOperatingStatus", async function(){
        it("Everybody can get operational status without access restrictions", async function () {
            let status = await flightSuretyAppContract.isOperational({from: TEST.whomever});
            assert.equal(status, true, "Unexpected operational status");
        });
        // it("Everybody can get operational status even when contract is not operational", async function () {
        //     await flightSuretyAppContract.setOperatingStatus(false, {from: TEST.contractOwner});
        //     let status = await flightSuretyAppContract.isOperational({from: TEST.whomever});
        //     assert.equal(status, false, "Unexpected operational status");
        // });
        it("Only contract owner can set operational status", async function () {
            await TEST.asyncTestForError(
                flightSuretyAppContract.setOperatingStatus,
                [false, {from: TEST.whomever}],
                TEST.ERROR.CALLER_NOT_CONTRACT_OWNER
            )
        });
    });

    describe("Airlines.registerAirline/ getAirline. No consensus required before 4 airlines are registered", async function(){
        it("Airline can not be registered when the contract is not operational", async function () {
            await flightSuretyAppContract.setOperationalStatus(false, {from: TEST.contractOwner});
            await TEST.asyncTestForError(
                flightSuretyAppContract.registerAirline,
                [TEST.secondAirline, {from: TEST.firstAirline}],
                TEST.ERROR.CONTRACT_NOT_OPERATIONAL
            )
        });
        it("Airline can not be registered when the caller is not registered airline", async function () {
            await TEST.asyncTestForError(
                flightSuretyAppContract.registerAirline,
                [TEST.secondAirline, {from: TEST.secondAirline}],
                'The sender is not an Airline operator'
            )
        });
        it("Airline can be registered, when the contract is operational and the caller is registered airline", async function () {
            await flightSuretyAppContract.registerAirline(
                TEST.secondAirline, {from: TEST.firstAirline}
            );
            let airline = await flightSuretyAppContract.getAirline(TEST.secondAirline);
            TEST.assertAirline(
                {
                    id: 2,
                },
                airline
            );
        });
    });

    // describe("Contract.payRegistrationFee", async function(){
    //     beforeEach(async () =>{
    //         console.log("    Log: Second Airline Registered");
    //         await flightSuretyAppContract.registerAirline(
    //             TEST.secondAirline, {from: TEST.firstAirline}
    //         );
    //     });
    //     it("Registration fee can not be paid when the contract is not operational ", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: TEST.contractOwner});
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.payRegistrationFee,
    //             // [TEST.registrationFee, {from: TEST.secondAirline, value: TEST.registrationFee}],
    //             [{from: TEST.secondAirline, value: TEST.registrationFee}],
    //             TEST.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Registration fee can not be paid when the caller is not registered airline", async function () {
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.payRegistrationFee,
    //             // [TEST.registrationFee, {from: TEST.fifthAirline, value: TEST.registrationFee}],
    //             [{from: TEST.secondAirline, value: TEST.registrationFee}],
    //             TEST.ERROR.AIRLINE_NOT_EXIST
    //         )
    //     });
    //     it("Registration fee can not be paid when the fee is < required", async function () {
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.payRegistrationFee,
    //             // [TEST.lessThatRegistrationFee, {from: TEST.secondAirline, value: TEST.lessThatRegistrationFee}],
    //             [{from: TEST.secondAirline, value: TEST.registrationFee}],
    //             TEST.ERROR.NOT_ENOUGH_VALUE
    //         )
    //     });
    //     it("Registration fee can be paid when the contract is operational, the caller is registered airline and the fee is >= required", async function () {
    //         flightSuretyDataContract.FundsAdded().on("data", event => {
    //             assert.equal(event.returnValues.contractAddress, flightSuretyDataContract.address, "Unexpected contract address");
    //         });
    //         flightSuretyAppContract.RegistrationFeePaid().on("data", event => {
    //             assert.equal(event.returnValues.airlineAddress, TEST.secondAirline, "Unexpected airline address");
    //         });
    //         let dataContractBalanceBefore = await TEST.currentBalanceAsBN(flightSuretyDataContract.address);
    //         await flightSuretyAppContract.payRegistrationFee(
    //             // TEST.registrationFee, {from: TEST.secondAirline, value: TEST.registrationFee}
    //             {from: TEST.secondAirline, value: TEST.registrationFee}
    //         );
    //         let dataContractBalanceAfter = await TEST.currentBalanceAsBN(flightSuretyDataContract.address);
    //         assert.equal(dataContractBalanceBefore.add(TEST.toBN(TEST.registrationFee)).eq(dataContractBalanceAfter), true, "Unexpected data contract balance");
    //     });
    // });

    // describe("Airlines.registerAirline/ getAirline. Consensus required after 4 airlines are registered", async function(){
    //     beforeEach(async()=>{
    //         console.log("    Log: 4 Airlines registered and 3 paid registration fee.");
    //         let addresses = [TEST.secondAirline, TEST.thirdAirline, TEST.fourthAirline];
    //         addresses.forEach(async (address, index) => {
    //             await flightSuretyAppContract.registerAirline(address, {from: TEST.firstAirline});
    //             if(index !== 2) {
    //                 await flightSuretyAppContract.payRegistrationFee({from: address, value: TEST.registrationFee});
    //             }
    //         });
    //     });
    //     it("Vote can not be counted when the caller did not pay registration fee", async function () {
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.registerAirline,
    //             [TEST.fifthAirline, {from: TEST.fourthAirline}],
    //             TEST.ERROR.REG_FEE_NOT_PAID
    //         )
    //     });
    //     it("Vote can not be counted when the caller has already voted", async function () {
    //         await flightSuretyAppContract.registerAirline(
    //             TEST.fifthAirline, {from: TEST.firstAirline}
    //         );
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.registerAirline,
    //             [TEST.fifthAirline, {from: TEST.firstAirline}],
    //             TEST.ERROR.HAS_ALREADY_VOTED
    //         )
    //     });
    //     it("Vote can be counted, when the caller paid registration fee and had not voted before.", async function () {
    //         flightSuretyAppContract.VoteCounted().on("data", event => {
    //             assert.equal(event.returnValues.isConsensusReached, false, "Unexpected consensus status afte the vote");
    //             assert.equal(event.returnValues.voteCount, 1, "Unexpected vote count");
    //             assert.equal(event.returnValues.totalCount, 4, "Unexpected total voters count");
    //         });
    //         await flightSuretyAppContract.registerAirline(
    //             TEST.fifthAirline, {from: TEST.firstAirline}
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
    //             TEST.fifthAirline, {from: TEST.firstAirline}
    //         );
    //         await flightSuretyAppContract.registerAirline(
    //             TEST.fifthAirline, {from: TEST.secondAirline}
    //         );
    //     });
    // });

    // describe("Insurances.setInsurancePremiumMultiplier/ getInsurancePremiumMultiplier", async function(){
    //     it("Insurance premium multiplier can not be set when the contract is not operational ", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: TEST.contractOwner});
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.setInsurancePremiumMultiplier,
    //             [TEST.insurancePremiumMultiplier.numerator, TEST.insurancePremiumMultiplier.denominator, {from: TEST.contractOwner}],
    //             TEST.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Insurance premium multiplier can not be set when the caller is not contract owner", async function () {
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.setInsurancePremiumMultiplier,
    //             [TEST.insurancePremiumMultiplier.numerator, TEST.insurancePremiumMultiplier.denominator, {from: TEST.whomever}],
    //             TEST.ERROR.CALLER_NOT_CONTRACT_OWNER
    //         )
    //     });

    //     it("Insurance premium multiplier can not be read when the contract is not operational", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: TEST.contractOwner});
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.getInsurancePremiumMultiplier,
    //             [{from: TEST.whomever}],
    //             TEST.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Insurance premium multiplier can be set when the contract is operational, the caller is contract owner", async function () {
    //         await flightSuretyAppContract.setInsurancePremiumMultiplier(TEST.insurancePremiumMultiplier.numerator, TEST.insurancePremiumMultiplier.denominator, {from: TEST.contractOwner});
    //         let response = await flightSuretyAppContract.getInsurancePremiumMultiplier({from: TEST.whomever});
    //         assert.equal(response.numerator, TEST.insurancePremiumMultiplier.numerator, "Unexpected insurance premium numerator");
    //         assert.equal(response.denominator, TEST.insurancePremiumMultiplier.denominator, "Unexpected insurance premium  denominator");
    //     });
    // });

    // describe("Flights.registerFlight/ getFlight", async function(){
    //     it("Flight can not be registered when the contract is not operational", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: TEST.contractOwner});
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.registerFlight,
    //             [TEST.flightOne.flight, TEST.flightOne.departure, TEST.firstAirline, {from: TEST.firstAirline}],
    //             TEST.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Flight can be registered when the contract is operational", async function () {
    //         await flightSuretyAppContract.registerFlight(
    //             TEST.flightOne.flight, TEST.flightOne.departure, TEST.firstAirline, {from: TEST.firstAirline},
    //         );
    //         let flight = await flightSuretyAppContract.getFlight(1);
    //         let key = await flightSuretyDataContract.createFlightKey(TEST.firstAirline, TEST.flightOne.flight, TEST.flightOne.departure, {from: TEST.whomever});
    //         TEST.assertFlight(
    //             {
    //                 id: 1,
    //                 flight: TEST.flightOne.flight,
    //                 key: key,
    //                 airline: TEST.firstAirline,
    //                 departure: TEST.flightOne.departure,
    //                 departureStatusCode: TEST.FLIGHT_STATUS_CODE.UNKNOWN,
    //                 state: TEST.FLIGHT_STATE.AVAILABLE
    //             },
    //             flight
    //         );
    //     });
    // });


    // describe("Insurances.buyInsurance/ getInsurance", async function(){
    //     beforeEach(async ()=>{
    //         console.log("    Log: flight created");
    //         await flightSuretyAppContract.registerFlight(
    //             TEST.flightOne.flight, TEST.flightOne.departure, TEST.firstAirline, {from: TEST.firstAirline}
    //             );
    //     });
    //     it("Insurance can not be bought when the contract is not operational", async function () {
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: TEST.contractOwner});
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.buyInsurance,
    //             [TEST.insuranceOne.flightId, TEST.insuranceOne.paid, {from: TEST.insuranceOne.passenger, value: TEST.insuranceOne.paid}],
    //             TEST.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    //     it("Insurance can not be bought when the amount paid is > insurance cap", async function () {
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.buyInsurance,
    //             [TEST.insuranceThatExceedCap.flightId, TEST.insuranceThatExceedCap.paid, {from: TEST.insuranceThatExceedCap.passenger, value: TEST.insuranceThatExceedCap.paid}],
    //             TEST.ERROR.EXCEED_CAP
    //         )
    //     });
    //     it("Insurance can be bought when the contract is operational, the amount paid is <= insurance cap", async function () {
    //         await flightSuretyAppContract.buyInsurance(
    //             TEST.insuranceOne.flightId, TEST.insuranceOne.paid, {from: TEST.insuranceOne.passenger, value: TEST.insuranceOne.paid}
    //         );
    //         let insurance = await flightSuretyAppContract.getInsurance(1);
    //         TEST.assertInsurance(
    //             {
    //                 id: 1,
    //                 flightId: TEST.insuranceOne.flightId,
    //                 amountPaid: TEST.insuranceOne.paid,
    //                 owner: TEST.insuranceOne.passenger,
    //                 state: TEST.INSURANCE_STATE.ACTIVE
    //             },
    //             insurance
    //         )
    //     });
    //     it("Insurance can not be read when the contract is not operational", async function () {
    //         await flightSuretyAppContract.buyInsurance(
    //             TEST.insuranceOne.flightId, TEST.insuranceOne.paid, {from: TEST.insuranceOne.passenger, value: TEST.insuranceOne.paid}
    //         );
    //         await flightSuretyAppContract.setOperationalStatus(false, {from: TEST.contractOwner});
    //         await TEST.asyncTestForError(
    //             flightSuretyAppContract.getInsurance,
    //             [1, {from: TEST.insuranceOne.passenger}],
    //             TEST.ERROR.CONTRACT_NOT_OPERATIONAL
    //         )
    //     });
    // });



    // describe("Flights.processFlightStatus", async function(){
    //     beforeEach(async ()=>{
    //         console.log("    Log: Flight Registered");
    //         await flightSuretyAppContract.registerFlight(
    //             TEST.flightOne.flight, TEST.flightOne.departure, TEST.firstAirline, {from: TEST.firstAirline},
    //         );
    //         console.log("    Log: Insurances for Flight Bought");
    //         [TEST.insuranceOne, TEST.insuranceFour].forEach(async insurance => {
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
    //                 let actualP1Credit = await flightSuretyDataContract.getCreditedAmount(TEST.insuranceOne.passenger);
    //                 let actualP4Credit = await flightSuretyDataContract.getCreditedAmount(TEST.insuranceFour.passenger);
    //                 let k = await flightSuretyAppContract.getInsurancePremiumMultiplier();
    //                 let expectedP1Credit = TEST.toBN(TEST.insuranceOne.paid).mul(k.numerator).div(k.denominator);
    //                 let expectedP4Credit = TEST.toBN(TEST.insuranceFour.paid).mul(k.numerator).div(k.denominator);
    //                 assert.equal(actualP1Credit.eq(expectedP1Credit), true, "Unexpected credit for passenger one");
    //                 assert.equal(actualP4Credit.eq(expectedP4Credit), true, "Unexpected credit for passenger four");
    //             }
    //         });
    //         await flightSuretyAppContract.processFlightStatus(
    //             TEST.firstAirline,
    //             TEST.flightOne.flight,
    //             TEST.flightOne.departure,
    //             TEST.FLIGHT_STATUS_CODE.LATE_AIRLINE,
    //             {from: TEST.whomever}
    //         );
    //     });

    // });

    // describe("fetchFlightStatus", async function(){

    // });
});