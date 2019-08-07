
import DOM from './dom';
import Contract from './contract';
import './flightsurety.css';


(async() => {

    let result = null;

    let contract = new Contract('localhost', () => {

        // contract.OracleRequest(function (err, result) {
        //     if (err) {
        //         return error(err);
        //     }

        //     log("OracleRequest: " + result.args.who);
        //     getCount();
        //     });

        // contract.OracleReport(function (err, result) {
        //     if (err) {
        //         return error(err);
        //     }

        //     log("OracleReport: " + result.args.who);
        //     getCount();
        // });


        // Read transaction
        let navs = ["contract-resource", "airlines-resource", "flights-resource", "insurances-resource", "funds-resource"].map(item=>{
            return DOM.elid(item);
        });
        let formContainers = ["contract-resource-forms", "airlines-resource-forms", "flights-resource-forms", "insurances-resource-forms", "funds-resource-forms"].map(item=>{
            return DOM.elid(item);
        });
        let displayWrapper = DOM.elid("display-wrapper");

        navs.forEach((navItem, index, arr) =>{
            navItem.addEventListener("click", ()=>{
                arr.forEach((item, idx, array) =>{
                    item.classList.remove("active");
                    formContainers[idx].style.display = "none";
                });
                navItem.classList.add("active");
                formContainers[index].style.display = "block";
                displayWrapper.innerHTML = "";
            });
        });

        DOM.elid("operational-status-get").addEventListener("click", async () => {
            let request = {
                from: DOM.elid("operational-status-get-from").value
            };
            let err, result;
            try {
                result = await contract.getOperationalStatus(request);
            } catch (e) {
                console.log(e);
                err = e;
            } finally {
                display('Operational Status', 'Check if contract is operational', [ { label: 'Operational Status', error: err, value: result} ]);

            }
        });

        DOM.elid("airline-register").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("airline-address");
            let from = DOM.elid("airline-register-from");
            let request = {
                airline: airlineAddress.value,
                from: from.value
            };
            let err, result, label
            try {
                await contract.registerAirline(request);
                label = "Success";
                result = "Airline is registered";
            } catch(e){
                console.log(e);
                label = "Failure";
                err = e;
            } finally {
                display(
                    "Register Airline",
                    "Registers new airline in the system, but does not allow it to vote without registration fee paid",
                    [{label: label, error: err, value: result}]
                )
            }
        });

        DOM.elid("airline-get").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("airline-address");
            let request = {
                airline: airlineAddress.value,
            };
            let err, result, label
            try {
                result = await contract.getAirlane(request);
                result = [
                    { label: "Id", error: err, value: result.id },
                    { label: "Votes", error: err, value: result.votes },
                    { label: "isAccepted", error: err, value: result.isAccepted }
                ];
            } catch(e){
                result = [ { label: "Failure", error: e, value: `Flight do not exists`} ]
            } finally {
                display(
                    "Get Airlane",
                    "Get Airlane",
                    result
                )
            }
        });

        DOM.elid("airline-candidate").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("airline-candidate-address");
            let from = DOM.elid("airline-candidate-register-from");
            let request = {
                airline: airlineAddress.value,
                from: from.value
            };
            let err, result, label
            try {
                await contract.voteToFly(request);
                label = "Success";
                result = "Vote registered";
            } catch(e){
                console.log(e);
                label = "Failure";
                err = e;
            } finally {
                display(
                    "Vote to Fly",
                    "Multi parti for airline",
                    [{label: label, error: err, value: result}]
                )
            }
        });

        DOM.elid("airline-fund").addEventListener("click", async () => {
            let airlineAddress = DOM.elid("airline-fund-address");
            let value = DOM.elid("airline-fund-value");
            let request = {
                from: airlineAddress.value,
                value: value.value
            };
            let err, result, label
            try {
                await contract.depositFundToOperate(request);
                label = "Success";
                result = "Deposit was funded";
            } catch(e){
                console.log(e);
                label = "Failure";
                err = e;
            } finally {
                display(
                    "Deposit Fund",
                    "Something happend!",
                    [{label: label, error: err, value: result}]
                )
            }
        });

        DOM.elid("register-flight").addEventListener("click", async ()=>{
            let request = {
                flight: DOM.elid("register-flight-flight-code").value,
                departure: new Date(DOM.elid("register-flight-departure").value).valueOf() / 1000,
                from: DOM.elid("register-flight-airline-address").value
            };

            let err, result, label;
            try {
                await contract.registerFlight(request);
                label = "Success";
            } catch (e) {
                err = e;
                console.log(e);
                label = "Failure";
            } finally {
                display('Register Flight', 'Creates new flight in the system', [ { label: label, error: err, value: "Flight is registered"} ]);
            }
        });

        DOM.elid("get-flight-id").addEventListener("click", async ()=>{
            let request = {
                flight: DOM.elid("register-flight-flight-code").value,
                departure: new Date(DOM.elid("register-flight-departure").value).valueOf() / 1000,
                airlineAddress: DOM.elid("register-flight-airline-address").value
            };

            let err, result, label, id;
            try {
                id = await contract.getFlightId(request);
                label = "Success";
            } catch (e) {
                err = e;
                console.log(e);
                label = "Failure";
            } finally {
                console.log(id)
                display('Get Flight Id', `Get Id of flight by its data`,  [ { label: label, error: err, value: `The flight id is ${id}`} ]);
            }
        });

        DOM.elid("submit-oracle").addEventListener("click", async () => {
            let request = {
                airline: DOM.elid("register-flight-airline-address").value,
                flight: DOM.elid("register-flight-flight-code").value,
                departure: new Date(DOM.elid("register-flight-departure").value).valueOf()/1000
            };

            counter = web3.eth.contract(abi).at(address);

            let err, result;
            try {
                result = await contract.fetchFlightStatus(request);
            } catch (e) {
                console.log(e);
                err = e;
            } finally {
                display('Flight Status',
                    'Send the request to Oracle server to get the flight status code for this flight',
                    [
                        { label: 'Flight Status Code', error: err, value: "result.status"}
                        ]
                );

            }
        });


        DOM.elid("get-flight").addEventListener("click", async ()=>{
            let request = {
                flight: DOM.elid("get-flight-flight-id").value
            };

            let err, result;
            try {
                result = await contract.getFlight(request);
                result = [
                    { label: "Airline Address", error: err, value: result.airlineAddress },
                    { label: "Code", error: err, value: result.flightCode },
                    { label: "Key", error: err, value: result.key },
                    { label: "Departure Status", error: err, value: result.departureStatusCode },
                    { label: "Departure", error: err, value: new Date(result.departureTimestamp.toNumber() * 1000) },
                    { label: "Updated", error: err, value: new Date(result.updatedTimestamp.toNumber() * 1000) },
                ];
            } catch (e) {
                result = [ { label: "Failure", error: e, value: `Flight do not exists`} ]
            } finally {
                display('Get Flight',
                    'Get flight from the system',
                    result
                );
            }
        });

        DOM.elid("buy-insurance").addEventListener("click", async ()=>{
            let request = {
                flight: DOM.elid("buy-insurance-flight-code").value,
                paid: DOM.elid("buy-insurance-paid-amount").value,
                from: DOM.elid("buy-insurance-from").value
            };

            let err, result, label;
            try {
                await contract.buyInsurance(request);
                label = "Success";
            } catch (e) {
                err = e;
                console.log(e);
                label = "Failure";
            } finally {
                display('Buy Insurance', 'Creates insurance for the passenger in the system', [ { label: label, error: err, value: "Insurance is bought"} ]);
            }
        });

        // User-submitted transaction
        DOM.elid('get-credited-amount').addEventListener('click', async () => {
            let request = {
                address: DOM.elid('fund-credited-amount-passenger-address').value
            };
            let err, result, label;
            label = "Credited Amount";
            try {
                result = await contract.getFundBalance(request);
            } catch (e) {
                err = e;
                console.log(e);
            } finally {
                display('Get Credited Amount', 'Retrieves the amount credited for address', [ { label: label, error: err, value: result} ]);
            }
        });

        DOM.elid('withdraw-credited-amount').addEventListener('click', async () => {
            let request = {
                amount: DOM.elid("fund-credited-amount-amount").value,
                from: DOM.elid("fund-credited-amount-passenger-address").value
            };
            let err, result, label;

            try {
                result = await contract.withdrawAmount(request);
                label = "Success";
            } catch (e) {
                err = e;
                label = "Failure";
                console.log(e);
            } finally {
                display('Withdraw Credited Amount', 'Transfers the amount specified to given address', [ { label: label, error: err, value: "Amount Withdrawn"} ]);
            }
        });

        DOM.elid("get-insurance").addEventListener("click", async ()=>{
            let request = {
                id: DOM.elid("get-insurance-id").value
            };
            console.log('addEventListeneraddEventListeneraddEventListener')
            let err, result, label;
            try {
                result = await contract.getInsurance(request);
                label = "Success";
            } catch (e) {
                err = e;
                console.log(e);
                label = "Failure";
            } finally {
                display('Get Insurance',
                    'Get flight from the system',
                    [
                        { label: "Flight Id", error: err, value: result.flightId },
                        { label: "State", error: err, value: result.state },
                        { label: "Amount Paid", error: err, value: result.amountPaid },
                        { label: "Owner", error: err, value: result.owner },
                    ]
                );
            }
        });

    });
})();


function display(title, description, results) {

    let displayDiv = DOM.elid("display-wrapper");
    displayDiv.innerHTML = "";
    console.log({displayDiv, title, description, results})
    let section = DOM.section();
    let row = DOM.div({className: "row"});
    let titleContainer = DOM.div({className: "col-12"});
    titleContainer.appendChild(DOM.h5(title));
    let descContainer = DOM.div({className:"col-12"});
    descContainer.appendChild(DOM.p(description));
    row.appendChild(titleContainer);
    row.appendChild(descContainer);
    results.map((result) => {
        // let row = section.appendChild(DOM.div({className:'row'}));
        row.appendChild(DOM.div({className: 'col-4 field'}, result.label));
        row.appendChild(DOM.div({className: 'col-8 field-value'}, result.error ? String(result.error) : String(result.value)));
        section.appendChild(row);
    });
    displayDiv.append(section);

}







