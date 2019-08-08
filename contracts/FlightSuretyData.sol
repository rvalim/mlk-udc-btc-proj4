pragma solidity >=0.4.25;

import "../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

contract FlightSuretyData {
    using SafeMath for uint256;

    struct Airline {
        uint id;
        bool fundPaid;
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
    // uint minAirlinePercentageApproval = 0.50;


    mapping(address => Airline) airlines;
    mapping(uint => Flight) flights;
    mapping(bytes32 => uint) flightKeyToId;
    mapping(uint => uint[]) flightToInsurances;
    mapping(uint => Insurance) insurances;
    mapping(address => uint[]) passengerToInsuranceIds;
    mapping(address => bool) authorizedCallers;
    mapping(address => uint) addressToFunds;


    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor()
    public
    payable
    {
        contractOwner = msg.sender;
        authorizedCallers[address(this)] = true;
        authorizedCallers[contractOwner] = true;

        //Register contract owner as ailine, activate and make the first deposit
        _registerAirline(contractOwner, contractOwner);
        activateAirline(contractOwner);
        payRegistrationFee(contractOwner);
    }
    /********************************************************************************************/
    /*                                       EVENT DEFINITIONS                                  */
    /********************************************************************************************/

    event ContractModeChanged(bool isOperational);
    event NewAirlineAdded(uint id, address airlineAddress);
    event NewFlightAdded(uint id, string flightCode);
    event NewInsuranceAdded(uint id, uint fligthId, address owner);
    event NewVoteForAirline(uint id, uint howMany);
    event AirlineAcceptedByMembers(uint id);
    event AirlineRegistrationFeePayed(uint id);
    event PassengerFundCredited(uint insuranceId, address passengerAddress);
    event PassengerFundWithDrawal(address owner, uint amount);
    event FlightDepartureUpdated(uint id, uint8 status);

    /********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

// region Modifiers
    modifier requireIsOperational()
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    modifier requireAuthorization()
    {
        require(authorizedCallers[msg.sender], "You are not authorized porra!");
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
        require (airlines[airlineAddress].fundPaid &&
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

    modifier requireElegible(address airline) {
        require(airlines[airline].isAccepted, "The airline need to be voted!");
        _;
    }

    modifier requireNotRegistered(
        string memory flightCode,
        uint departureTimestamp,
        address airlineAddress
    ) {
        bytes32 key = getFlightKey(flightCode, departureTimestamp, airlineAddress);
        require(flightKeyToId[key] == 0, "The flight has already been created!");
        _;
    }
// endregion

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

// region Utilities
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

    function setAuthorizedCaller(
        address caller,
        bool auth
    )
    public
    requireContractOwner
    {
        authorizedCallers[caller] = auth;
    }
// endregion

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/
// region Airline
    function registerAirline
    (
        address candidate,
        address promoter
    )
    external
    requireAirlines(promoter)
    returns(uint)
    {
        return _registerAirline(candidate, promoter);
    }

    function _registerAirline
    (
        address candidate,
        address promoter
    )
    internal
    requireIsOperational
    requireAuthorization
    requireAirlineNotRegistered(candidate)
    returns(uint)
    {
        countAirlines++;

        airlines[candidate].id = countAirlines;
        //airlines[candidate].isAccepted = (countAirlines < minAirlineConsensus);
        airlines[candidate].votes.push(airlines[promoter].id);

        emit NewAirlineAdded(countAirlines, candidate);

        return countAirlines;
    }

    function voteAirlineToOperate (
        address candidate,
        address voter
    )
    public
    requireIsOperational
    requireAuthorization
    requireCandidate(candidate)
    requireAirlines(voter)
    requireAirlineOperable(voter)
    requireNotVoteYet(candidate, voter)
    {
        uint id = airlines[voter].id;
        airlines[candidate].votes.push(id);

        uint lenVotes = airlines[candidate].votes.length;

        emit NewVoteForAirline(airlines[candidate].id, lenVotes);
    }

    function activateAirline(
        address candidate
    )
    public
    requireIsOperational
    requireAuthorization
    requireCandidate(candidate)
    {
        airlines[candidate].isAccepted = true;
        emit AirlineAcceptedByMembers(airlines[candidate].id);
    }

    function getAirlineData
    (
        address airline
    )
    external
    requireIsOperational
    requireAuthorization
    requireAirlines(airline)
    view
    returns (uint id, uint[] memory votes, bool isAccepted)
    {
        id = airlines[airline].id;
        votes = airlines[airline].votes;
        isAccepted = airlines[airline].isAccepted;
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */
    function payRegistrationFee
    (
        address owner
    )
    public
    requireIsOperational
    requireAuthorization
    requireElegible(owner)
    payable
    {
        // address payable addr = make_payable(owner);
        address(this).transfer(msg.value);
        airlines[owner].fundPaid = true;

        emit AirlineRegistrationFeePayed(airlines[owner].id);
    }

//     function make_payable(address x) internal pure returns (address payable) {
//       return address(uint160(x));
//    }
// endregion

// region Flight
    function registerFlight(
        string memory flightCode,
        uint departureTimestamp,
        address airlineAddress
    )
    public
    requireIsOperational
    requireAuthorization
    requireAirlineOperable(airlineAddress)
    requireFligthOnTime(departureTimestamp)
    requireNotRegistered(flightCode, departureTimestamp, airlineAddress)
    {
        countFlights++;
        bytes32 key = getFlightKey(flightCode, departureTimestamp, airlineAddress);

        flights[countFlights].id = countFlights;
        flights[countFlights].key = key;
        flights[countFlights].flightCode = flightCode;
        flights[countFlights].airlineAddress = airlineAddress;
        flights[countFlights].departureTimestamp = departureTimestamp;

        flightKeyToId[key] = countFlights;

        emit NewFlightAdded(countFlights, flightCode);
    }

    function getFlightId
    (
        string memory flightCode,
        uint256 departureTimestamp,
        address airlineAddress
    )
    public
    requireIsOperational
    requireAuthorization
    view
    returns(uint)
    {
        bytes32 key = getFlightKey(flightCode, departureTimestamp, airlineAddress);
        return flightKeyToId[key];
    }

    function getFlightKey
    (
        string memory flightCode,
        uint256 departureTimestamp,
        address airlineAddress
    )
    public
    requireIsOperational
    requireAuthorization
    view
    returns(bytes32)
    {
        return keccak256(abi.encodePacked(airlineAddress, flightCode, departureTimestamp));
    }

    function getFlightIdByKey(bytes32 _key)
    external
    requireIsOperational
    requireAuthorization
    requireFligth(flightKeyToId[_key])
    view
    returns (uint)
    {
        return flightKeyToId[_key];
    }

    function getFlight(
        uint id
    )
    external
    requireIsOperational
    requireAuthorization
    requireFligth(id)
    view
    returns (
        bytes32 key,
        address airlineAddress,
        string memory flightCode,
        uint8 departureStatusCode,
        uint departureTimestamp,
        uint updatedTimestamp
    )
    {
        key = flights[id].key;
        airlineAddress = flights[id].airlineAddress;
        flightCode = flights[id].flightCode;
        departureStatusCode = flights[id].departureStatusCode;
        departureTimestamp = flights[id].departureTimestamp;
        updatedTimestamp = flights[id].updatedTimestamp;
    }
// endregion

// region Insurance
    /**
    * @dev Buy insurance for a flight
    *
    */
    function registerInsurance
    (
        uint _flightId,
        address _owner
    )
    public
    requireIsOperational
    requireAuthorization
    requireFligth(_flightId)
    requireFligthOnTime(_flightId)
    payable
    {
        countInsurance++;
        insurances[countInsurance] = Insurance({
            id: countInsurance,
            flightId: _flightId,
            amountPaid: msg.value,
            passenger: _owner,
            state: InsuranceState.Sleeping
        });

        // address payable addr = make_payable(_owner);
        // addr.transfer(msg.value);

        emit NewInsuranceAdded(countInsurance, _flightId, _owner);
    }

    function getInsurance(uint _id)
    public
    requireIsOperational
    requireAuthorization
    requireInsurance(_id)
    view
    returns (uint flightId, string memory state, uint amountPaid, address owner)
    {
        Insurance memory insurance = insurances[_id];
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

    function getInsurancesByFlight(uint _id)
    public
    requireIsOperational
    requireAuthorization
    requireFligth(_id)
    view
    returns (uint[] memory listInsurances)
    {
        listInsurances = flightToInsurances[_id];
    }
// endregion

// region User Fund
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

        emit PassengerFundCredited(insuranceId, i.passenger);
    }

    function withdrawalFund
    (
        uint amount,
        address owner
    )
    public
    requireIsOperational
    requireAuthorization
    requirePassengerFunds(owner, amount)
    requireContractFunds(amount)
    payable
    {
        addressToFunds[owner] = addressToFunds[owner].sub(amount);
        owner.transfer(amount);

        emit PassengerFundWithDrawal(owner, amount);
    }

    function getFundBalance (address owner)
    public
    requireIsOperational
    requireAuthorization
    view
    returns (uint)
    {
        return addressToFunds[owner];
    }
// endregion User Fund

    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function pay(uint amount)
    internal
    {
        address(this).transfer(amount);
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function()
    external
    payable
    {
    }


    // function flightDepartureUpdate
    // (uint _id, uint8 _statusCode)
    // public
    // requireIsOperational
    // requireFligth(_id)
    // {
    //     flights[_id].departureStatusCode = _statusCode;
    //     flights[_id].updatedTimestamp = now;
    //     emit FlightDepartureUpdated(_id, _statusCode);
    // }

}

