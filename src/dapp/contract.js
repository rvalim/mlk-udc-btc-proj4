import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import Config from './config.json';
import Web3 from 'web3';
const TruffleContract = require("truffle-contract");

export default class Contract {
    constructor(network, callback) {

        this.config = Config[network];
        // let web3Provider = new Web3.providers.HttpProvider(config.url);
        let web3Provider = new Web3.providers.WebsocketProvider(this.config.url.replace('http', 'ws'));
        this.web3 = new Web3(web3Provider);
        // this.flightSuretyApp = new this.web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
        this.flightSuretyApp = TruffleContract(FlightSuretyApp);
        this.flightSuretyApp.setProvider(web3Provider);
        this.initialize(callback);
        this.owner = null;
        this.airlines = [];
        this.passengers = [];
    }

    initialize(callback) {
        this.web3.eth.getAccounts((error, accts) => {

            this.owner = accts[0];

            let counter = 1;

            while(this.airlines.length < 5) {
                this.airlines.push(accts[counter++]);
            }

            while(this.passengers.length < 5) {
                this.passengers.push(accts[counter++]);
            }

            callback();
        });
    }

    async getContractInstance(){
        return await this.flightSuretyApp.at(this.config.appAddress);
    }

    async getOperationalStatus(request) {
        let self = this;
        console.log(self.owner);
        let caller = request.from || self.owner;
        let instance = await this.getContractInstance();
        return await instance.isOperational({from: caller});
    }

    async fetchFlightStatus(request) {
        console.log('fetchFlightStatus')
        let caller = request.from || this.owner;
        let instance = await this.getContractInstance();
        instance.OracleRequest().on("data", async event => {
            console.log(event.returnValues);
        });
        instance.FlightStatusInfo().on("data", async event => {
            console.log(event.returnValues);
            return await event.returnValues;
        });
        await instance.fetchFlightStatus(request.airline, request.flight, request.departure, {from: caller});
    }
    async registerAirline(request) {
        let caller = request.from || this.owner;
        console.log(caller)
        let instance = await this.getContractInstance();
        return await instance.registerAirline(request.airline, {from: caller});
    }
    async getAirlane(request) {
        let caller = request.from || this.owner;
        console.log(caller)
        let instance = await this.getContractInstance();
        return await instance.getAirline(request.airline, {from: caller});
    }
    async voteToFly(request) {
        let caller = request.from;
        console.log(caller)
        let instance = await this.getContractInstance();
        return await instance.voteToFly(request.airline, {from: caller});
    }
    async depositFundToOperate(request) {
        let from = request.from;
        let value = this.web3.utils.toWei(request.value.toString(), "ether");
        let instance = await this.getContractInstance();
        console.log(request, { from, value })
        let gasEstimateUnits = await instance.depositFundToOperate.estimateGas({ from, value });
        console.log(gasEstimateUnits);
        console.log(value);
        return await instance.depositFundToOperate({ from, value });
    }
    async getFlightId(request){
        let caller = request.airlineAddress;
        let instance = await this.getContractInstance();
        return await instance.getFlightId(request.flight, request.departure, caller, {from: caller} );
    }

    async registerFlight(request){
        let caller = request.from || this.owner;
        let instance = await this.getContractInstance();
        return await instance.registerFlight(request.flight, request.departure, {from: caller} );
    }

    async getFlight(request){
        let caller = request.from || this.owner;
        let instance = await this.getContractInstance();
        let result = await instance.getFlight(request.flight, {from: caller});
        console.log(result);
        return result;
    }

    async buyInsurance(request){
        console.log(request);
        let caller = request.from || this.owner;
        let instance = await this.getContractInstance();
        let paid = this.web3.utils.toWei(request.paid.toString(), "ether");
        let gasEstimateUnits = await instance.buyInsurance.estimateGas(request.flight, {from: caller, value: paid});
        console.log(gasEstimateUnits);
        console.log(paid);
        return await instance.buyInsurance(request.flight, {from: caller, value: paid});
    }

    async getInsurance(request){
        console.log(request);
        let instance = await this.getContractInstance();
        let result = await instance.getInsurance(request.id);
        console.log(result);
        return result;
    }

    async getFundBalance(request){
        let instance = await this.getContractInstance();
        let result = await instance.getFundBalance(request.address);
        console.log(result);
        return result;
    }

    async withdrawAmount(request){
        let caller = request.from;
        let instance = await this.getContractInstance();
        let amount = this.web3.utils.toWei(request.amount.toString(), "ether");
        return await instance.withdrawalFund(amount, {from: caller});
    }
}