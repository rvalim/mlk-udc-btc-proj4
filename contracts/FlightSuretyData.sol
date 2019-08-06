pragma solidity >=0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    struct Airline {
        uint id;
        uint wallet;
        bool isAccepted;
        uint[] votes;
    }

    struct Flight{
        uint id;
        bytes32 key;
        address airlineAddress;
        string flightCode;
        uint8 departureStatusCode;
        uint departureTimestamp;
        uint updatedTimestamp;
    }

    enum InsuranceState {Sleeping, Expired, Refunded}
    struct Insurance{
        uint id;
        uint flightId;
        uint amountPaid;
        address passenger;
        InsuranceState state;
    }

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/
    uint countAirlines = 0;
    uint countFlights = 0;
    uint countInsurance = 0;
    address contractOwner;                                      // Account used to deploy contract
    bool operational = true;                                    // Blocks all state changes throughout the contract if false
    uint minAirlineWallet = 10;
    uint minAirlineConsensus = 4;
    // uint minAirlinePercentageApproval = 0.50;


    mapping(address => Airline) airlines;
    mapping(uint => Flight) flights;
    mapping(bytes32 => uint) flightKeyToId;
    mapping(uint => uint[]) flightToInsurances;
    mapping(uint => Insurance) insurances;
    mapping(address => uint[]) passengerToInsuranceIds;
    mapping(address => bool) authorizedCallers;
    mapping(address => uint) addressToFunds;


    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor()
    public
    {
        contractOwner = msg.sender;
        // authorizedCallers[contractOwner] = true;
    }

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier requireAuthorization()
    {
        require(authorizedCallers[msg.sender], "You are not authorized!");
        _;
    }

    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    modifier requireAirlines(address airlineAddress) {
        require (airlines[airlineAddress].id > 0, "The sender is not an Airline operator");
        _;
    }

    modifier requireAirlineNotRegistered(address airlineAddress) {
        require (airlines[airlineAddress].id == 0, "The address is already in use");
        _;
    }

    modifier requireAirlineOperable(address airlineAddress)
    {
        require (
                airlines[airlineAddress].wallet > minAirlineWallet &&
                airlines[airlineAddress].isAccepted,
                "The Airline has not the minimum amount on ether to operate");
        _;
    }

    modifier requireNotVoteYet(
        address candidate,
        address voter
    )
    {
        uint[] memory votes = airlines[candidate].votes;
        uint idApprover = airlines[voter].id;

        bool found = false;
        for (uint i = 0; i < votes.length; i++) {
            if(votes[i]==idApprover){
                found = true;
                break;
            }
        }

        require (!found, "You already vote for this new Airlane");
        _;
    }

    modifier requireInsurance(uint id) {
        require(insurances[id].id > 0, "Insurance do not exist");
        _;
    }

    modifier requireInsuranceState(uint id, InsuranceState state) {
        require(insurances[id].state == state, "Insurance not in the expected state.");
        _;
    }

    modifier requireFligth(uint id){
        require(flights[id].id > 0, "Flight do not exist!");
        _;
    }

    modifier requireFligthOnTime(uint id){
        // require(flights[id].departureTimestamp > now, "Flight has already departed!");
        _;
    }

    modifier requirePassengerFunds
    (
        address _address,
        uint amount
    )
    {
        require(amount <= addressToFunds[_address], "The passenger has no funds!");
        _;
    }

    modifier requireContractFunds
    (
        uint amount
    )
    {
        require(address(this).balance >= amount, "Bankrupt =D");
        _;
    }

    modifier requireDiferentMode(bool mode) {
        require(isOperational() != mode, "Contract already in this mode!");
        _;
    }

    modifier requireCandidate(address candidate) {
        require(!airlines[candidate].isAccepted, "The airline has already been accepted!");
        _;
    }
    /********************************************************************************************/
    /*                                            EVENTS                                        */
    /********************************************************************************************/

    event ContractModeChanged(bool isOperational);
    event NewAirlineAdded(uint id, address airlineAddress);
    event NewFlightAdded(uint id, string flightCode);
    event NewInsuranceAdded(uint id, string flightCode, address owner);
    event AmountAddedToInsuree(uint insuranceId, address passengerAddress);
    event AmountWithdrawnToInsuree(address owner, uint amount);
    event FlightDepartureUpdated(uint id, uint8 status);

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational()
                            public
                            view
                            returns(bool)
    {
        return operational;
    }

    function setOperatingStatus
    (
        bool mode
    )
    external
    requireIsOperational
    requireAuthorization
    requireDiferentMode(mode)
    {
        operational = mode;
        emit ContractModeChanged(mode);
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */
    function registerAirline
    (
        address candidate,
        address promoter
    )
    external
    requireIsOperational
    requireAuthorization
    requireAirlines(promoter)
    requireAirlineNotRegistered(candidate)
    {
        countAirlines++;

        airlines[candidate].id = countAirlines;
        airlines[candidate].wallet = 0;
        airlines[candidate].isAccepted = countAirlines >= minAirlineConsensus;
        airlines[candidate].votes.push(airlines[promoter].id);

        // return countAirlines;
        // emit NewAirlineAdded(countAirlines, candidate);
    }

    function registerFlight(
        string memory flightCode,
        address airlineAddress,
        uint departureTimestamp
    )
    public
    requireIsOperational
    requireAuthorization
    requireAirlineOperable(airlineAddress)
    requireFligthOnTime(departureTimestamp)
    {
        countFlights++;
        bytes32 key = getFlightKey(airlineAddress, flightCode, departureTimestamp);

        flights[countFlights].id = countFlights;
        flights[countFlights].key = key;
        flights[countFlights].flightCode = flightCode;
        flights[countFlights].airlineAddress = airlineAddress;
        flights[countFlights].departureTimestamp = departureTimestamp;

        flightKeyToId[key] = countFlights;

        // return countFlights;
        // emit NewFlightAdded(id, flightCode);
    }

    /**
    * @dev Buy insurance for a flight
    *
    */
    function registerInsurance
    (
        uint _flightId,
        address _owner,
        uint _value
    )
    public
    requireIsOperational
    requireAuthorization
    requireFligth(_flightId)
    requireFligthOnTime(_flightId)
    {
        countInsurance++;
        insurances[countInsurance] = Insurance({
            id: countInsurance,
            flightId: _flightId,
            amountPaid: _value,
            passenger: _owner,
            state: InsuranceState.Sleeping
        });

        // return countInsurance;
        // emit NewInsuranceAdded(countInsurance, _flightCode, _owner);
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
    (
        uint insuranceId,
        uint amount
    )
    public
    requireIsOperational
    requireAuthorization
    requireInsurance(insuranceId)
    requireInsuranceState(insuranceId, InsuranceState.Sleeping)
    {
        Insurance memory i = insurances[insuranceId];
        addressToFunds[i.passenger].add(amount);
        insurances[insuranceId].state = InsuranceState.Refunded;
        // emit AmountAddedToInsuree(insuranceId, passengerAddress);
    }


    function withdrawInsurees
    (
        uint _amountToWithdraw,
        address _address
    )
    public
    requireIsOperational
    requireAuthorization
    requirePassengerFunds(_address, _amountToWithdraw)
    requireContractFunds(_amountToWithdraw)
    payable
    {
        addressToFunds[_address] = addressToFunds[_address].sub(_amountToWithdraw);
        _address.transfer(_amountToWithdraw);
        // emit AmountWithdrawnToInsuree(_address, _amountToWithdraw);
    }


    function getInsurance(uint _id)
    public
    requireIsOperational
    requireAuthorization
    requireInsurance(_id)
    view
    returns (uint id, uint flightId, string memory state, uint amountPaid, address owner)
    {
        Insurance memory insurance = insurances[_id];
        id = insurance.id;
        flightId = insurance.flightId;
        amountPaid = insurance.amountPaid;
        owner = insurance.passenger;
        if(uint(insurance.state) == 0) {
            state = "Sleeping";
        }
        if(uint(insurance.state) == 1) {
            state = "Expired";
        }
        if(uint(insurance.state) == 2) {
            state = "Credited";
        }
    }

//     /**
//      *  @dev Transfers eligible payout funds to insuree
//      *
//     */
//     function pay
//                             (
//                             )
//     public
//     requireIsOperational
//     requireAuthorization
//     {
//     }

//    /**
//     * @dev Initial funding for the insurance. Unless there are too many delayed flights
//     *      resulting in insurance payouts, the contract should be self-sustaining
//     *
//     */
//     function fund
//                             (
//                             )
//     public
//     requireIsOperational
//     requireAuthorization
//     {
//     }

    function getFlightKey
    (
        address airline,
        string flight,
        uint256 timestamp
    )
    public
    requireIsOperational
    requireAuthorization
    view
    returns(bytes32)
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

//     /**
//     * @dev Fallback function for funding smart contract.
//     *
//     */
//     function()
//                             external
//                             payable
//     {
//         fund();
//     }
    function getFlightIdByKey(bytes32 _key) external
    requireIsOperational
    requireFligth(flightKeyToId[_key])
    view
    returns (uint)
    {
        return flightKeyToId[_key];
    }

    function flightDepartureUpdate
    (uint _id, uint8 _statusCode)
    public
    requireIsOperational
    requireFligth(_id)
    {
        flights[_id].departureStatusCode = _statusCode;
        flights[_id].updatedTimestamp = now;
        emit FlightDepartureUpdated(_id, _statusCode);
    }

    function getInsurancesByFlight
    (uint _id)
    public
    requireIsOperational
    requireFligth(_id)
    view
    returns (uint[] listInsurances)
    {
        listInsurances = flightToInsurances[_id];
    }

    // Credited Amount Resource
    function getCreditedAmount
    (address _address)
    public
    requireIsOperational
    view
    returns (uint amountCredited)
    {
        amountCredited = addressToFunds[_address];
    }

    //mine
    // function getAirline
    // (address airlineAddress)
    // public
    // requireIsOperational
    // requireFligth(_id)
    // view
    // returns (uint id, bool isAccepted, uint[] votes)
    // {
    //     id = airlines[airlineAddress].id;
    //     isAccepted = airlines[airlineAddress].isAccepted;
    //     votes = airlines[airlineAddress].votes;
    // }
}

