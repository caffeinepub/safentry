import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Char "mo:core/Char";
import Int "mo:core/Int";
import Option "mo:core/Option";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";

actor {
  // Initialize access control
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // User Profile Type
  public type UserProfile = {
    employeeId : ?Text;
    name : Text;
    surname : Text;
  };

  let userProfiles = Map.empty<Principal, UserProfile>();

  // Types
  type Company = {
    companyId : Text;
    loginCode : Text;
    name : Text;
    sector : Text;
    address : Text;
    contactPersonName : Text;
    createdAt : Time.Time;
  };

  type Employee = {
    employeeId : Text;
    name : Text;
    surname : Text;
    createdAt : Time.Time;
  };

  type EmployeeRole = { #owner; #authorized; #registrar };

  type CompanyEmployee = {
    companyId : Text;
    employeeId : Text;
    role : EmployeeRole;
  };

  type Visitor = {
    visitorId : Text;
    companyId : Text;
    name : Text;
    surname : Text;
    tcId : Text;
    phone : Text;
    visitingPerson : Text;
    visitPurpose : Text;
    entryTime : Time.Time;
    exitTime : ?Time.Time;
    signatureData : Text;
    documentCode : Text;
    createdBy : Text; // employeeId of creator
  };

  type CompanyStats = {
    totalVisitors : Nat;
    activeVisitorsToday : Nat;
  };

  type VerifyDocumentResult = {
    visitorId : Text;
    name : Text;
    surname : Text;
    visitPurpose : Text;
    companyName : Text;
  };

  // Persistent storage
  let companies = Map.empty<Text, Company>();
  let employees = Map.empty<Text, Employee>();
  let companyEmployees = Map.empty<Text, EmployeeRole>(); // Key format: "companyId_employeeId"
  let visitors = Map.empty<Text, Visitor>();
  let activeVisitors = Set.empty<Text>();
  let documentCodeToVisitorId = Map.empty<Text, Text>();
  let principalToEmployeeId = Map.empty<Principal, Text>();

  // Helper functions
  func generateRandomText(length : Nat) : Text {
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var result = "";
    let charsArray = characters.toArray();
    var seed = Int.abs(Time.now());
    let rangeArray = Array.tabulate(length, func(i) { i });
    for (i in rangeArray.values()) {
      seed := (seed * 1103515245 + 12345) % 2147483647;
      let randomIndex = Int.abs(seed) % charsArray.size();
      result #= Text.fromChar(charsArray[randomIndex]);
    };
    result;
  };

  func getCombinedKey(companyId : Text, employeeId : Text) : Text {
    companyId # "_" # employeeId;
  };

  func getEmployeeRole(companyId : Text, employeeId : Text) : ?EmployeeRole {
    let key = getCombinedKey(companyId, employeeId);
    companyEmployees.get(key);
  };

  func isOwner(companyId : Text, employeeId : Text) : Bool {
    switch (getEmployeeRole(companyId, employeeId)) {
      case (?#owner) { true };
      case (_) { false };
    };
  };

  func isOwnerOrAuthorized(companyId : Text, employeeId : Text) : Bool {
    switch (getEmployeeRole(companyId, employeeId)) {
      case (?#owner) { true };
      case (?#authorized) { true };
      case (_) { false };
    };
  };

  func hasAnyRole(companyId : Text, employeeId : Text) : Bool {
    switch (getEmployeeRole(companyId, employeeId)) {
      case (?_) { true };
      case (null) { false };
    };
  };

  func getEmployeeIdFromCaller(caller : Principal) : ?Text {
    principalToEmployeeId.get(caller);
  };

  // User Profile Functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can access profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Public functions with authorization

  public shared ({ caller }) func registerCompany(name : Text, sector : Text, address : Text, contactPersonName : Text) : async { companyId : Text; loginCode : Text } {
    let companyId = generateRandomText(11);
    let loginCode = generateRandomText(12);

    let company : Company = {
      companyId;
      loginCode;
      name;
      sector;
      address;
      contactPersonName;
      createdAt = Time.now();
    };

    companies.add(companyId, company);
    { companyId; loginCode };
  };

  public query ({ caller }) func loginCompany(loginCode : Text) : async ?Company {
    for ((_, company) in companies.entries()) {
      if (company.loginCode == loginCode) {
        return ?company;
      };
    };
    null;
  };

  public shared ({ caller }) func registerEmployee(name : Text, surname : Text) : async Text {
    let employeeId = generateRandomText(8);
    let employee : Employee = {
      employeeId;
      name;
      surname;
      createdAt = Time.now();
    };
    employees.add(employeeId, employee);
    principalToEmployeeId.add(caller, employeeId);
    employeeId;
  };

  public query ({ caller }) func loginEmployee(employeeId : Text) : async ?Employee {
    employees.get(employeeId);
  };

  public shared ({ caller }) func addEmployeeToCompany(companyId : Text, employeeId : Text, role : EmployeeRole) : async () {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Check if caller is owner or authorized in the company
    if (not isOwnerOrAuthorized(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: Only owner or authorized can add employees");
    };

    // Verify company and employee exist
    switch (companies.get(companyId), employees.get(employeeId)) {
      case (?_, ?_) {
        let key = getCombinedKey(companyId, employeeId);
        companyEmployees.add(key, role);
      };
      case (_) { Runtime.trap("Company or employee not found") };
    };
  };

  public query ({ caller }) func getMyCompanies(employeeId : Text) : async [(Company, EmployeeRole)] {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Verify caller is requesting their own companies
    if (callerEmployeeId != employeeId) {
      Runtime.trap("Unauthorized: Can only view your own companies");
    };

    var result : [(Company, EmployeeRole)] = [];
    for ((key, role) in companyEmployees.entries()) {
      if (key.endsWith(#text("_" # employeeId))) {
        let parts = key.split(#char '_').toArray();
        if (parts.size() == 2) {
          let companyId = parts[0];
          switch (companies.get(companyId)) {
            case (?company) {
              result := result.concat([(company, role)]);
            };
            case (null) {};
          };
        };
      };
    };
    result;
  };

  public shared ({ caller }) func setEmployeeRole(companyId : Text, targetEmployeeId : Text, role : EmployeeRole) : async () {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Only owner can set roles
    if (not isOwner(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: Only owner can set employee roles");
    };

    let key = getCombinedKey(companyId, targetEmployeeId);
    if (not companyEmployees.containsKey(key)) {
      Runtime.trap("Employee not found in company");
    };
    companyEmployees.add(key, role);
  };

  public shared ({ caller }) func removeEmployeeFromCompany(companyId : Text, targetEmployeeId : Text) : async () {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Only owner can remove employees
    if (not isOwner(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: Only owner can remove employees");
    };

    let key = getCombinedKey(companyId, targetEmployeeId);
    if (not companyEmployees.containsKey(key)) {
      Runtime.trap("Employee not found in company");
    };
    companyEmployees.remove(key);
  };

  public shared ({ caller }) func registerVisitor(companyId : Text, name : Text, surname : Text, tcId : Text, phone : Text, visitingPerson : Text, visitPurpose : Text, signatureData : Text) : async Text {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Check if caller has any role in the company (owner, authorized, or registrar can register)
    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to register visitors");
    };

    let visitorId = generateRandomText(10);
    let documentCode = generateRandomText(12);
    let visitor : Visitor = {
      visitorId;
      companyId;
      name;
      surname;
      tcId;
      phone;
      visitingPerson;
      visitPurpose;
      entryTime = Time.now();
      exitTime = null;
      signatureData;
      documentCode;
      createdBy = callerEmployeeId;
    };
    visitors.add(visitorId, visitor);
    activeVisitors.add(visitorId);
    documentCodeToVisitorId.add(documentCode, visitorId);
    visitorId;
  };

  public shared ({ caller }) func checkoutVisitor(visitorId : Text, companyId : Text) : async () {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Check if caller has any role in the company
    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company");
    };

    switch (visitors.get(visitorId)) {
      case (?visitor) {
        if (visitor.companyId != companyId) {
          Runtime.trap("Visitor does not belong to this company");
        };
        activeVisitors.remove(visitorId);
        let updatedVisitor : Visitor = {
          visitor with exitTime = ?Time.now();
        };
        visitors.add(visitorId, updatedVisitor);
      };
      case (null) {
        Runtime.trap("Visitor not found");
      };
    };
  };

  public query ({ caller }) func getVisitors(companyId : Text) : async [Visitor] {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Check if caller has any role in the company
    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company");
    };

    var result : [Visitor] = [];
    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == companyId) {
        result := result.concat([visitor]);
      };
    };
    result;
  };

  public query ({ caller }) func getVisitorById(visitorId : Text, companyId : Text) : async ?Visitor {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Check if caller has any role in the company
    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company");
    };

    switch (visitors.get(visitorId)) {
      case (?visitor) {
        if (visitor.companyId != companyId) {
          Runtime.trap("Visitor does not belong to this company");
        };
        ?visitor;
      };
      case (null) { null };
    };
  };

  public shared ({ caller }) func updateVisitorSignature(visitorId : Text, companyId : Text, signatureData : Text) : async () {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Check if caller has any role in the company
    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company");
    };

    switch (visitors.get(visitorId)) {
      case (?visitor) {
        if (visitor.companyId != companyId) {
          Runtime.trap("Visitor does not belong to this company");
        };
        let updatedVisitor : Visitor = {
          visitor with signatureData
        };
        visitors.add(visitorId, updatedVisitor);
      };
      case (null) {
        Runtime.trap("Visitor not found");
      };
    };
  };

  public query ({ caller }) func verifyDocument(documentCode : Text) : async ?VerifyDocumentResult {
    // Public function - no authentication required
    switch (documentCodeToVisitorId.get(documentCode)) {
      case (?visitorId) {
        switch (visitors.get(visitorId)) {
          case (?visitor) {
            let companyName = switch (companies.get(visitor.companyId)) {
              case (?company) { company.name };
              case (null) { "Unknown Company" };
            };
            ?{
              visitorId = visitor.visitorId;
              name = visitor.name;
              surname = visitor.surname;
              visitPurpose = visitor.visitPurpose;
              companyName;
            };
          };
          case (null) { null };
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getCompanyEmployees(companyId : Text) : async [{ employee : Employee; role : EmployeeRole }] {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Check if caller has any role in the company
    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company");
    };

    var result : [{ employee : Employee; role : EmployeeRole }] = [];
    let companyIdPrefix = companyId # "_";

    for ((key, role) in companyEmployees.entries()) {
      if (key.startsWith(#text companyIdPrefix)) {
        let parts = key.split(#char '_').toArray();
        if (parts.size() == 2) {
          let employeeId = parts[1];
          switch (employees.get(employeeId)) {
            case (?employee) {
              result := result.concat([{ employee; role }]);
            };
            case (null) {};
          };
        };
      };
    };
    result;
  };

  public query ({ caller }) func getCompanyStats(companyId : Text) : async CompanyStats {
    // Get caller's employeeId
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    // Only owner or authorized can view stats
    if (not isOwnerOrAuthorized(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: Only owner or authorized can view company stats");
    };

    var totalVisitors = 0;
    var activeVisitorsToday = 0;

    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == companyId) {
        totalVisitors += 1;
        switch (visitor.exitTime) {
          case (null) { activeVisitorsToday += 1 };
          case (_) {};
        };
      };
    };

    {
      totalVisitors;
      activeVisitorsToday;
    };
  };
};
