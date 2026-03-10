import Map "mo:core/Map";
import Set "mo:core/Set";
import Array "mo:core/Array";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Runtime "mo:core/Runtime";
import Char "mo:core/Char";
import Int "mo:core/Int";
import Nat "mo:core/Nat";
import Iter "mo:core/Iter";
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
    vehiclePlate : ?Text; // The new field
  };

  type CompanyStats = {
    totalVisitors : Nat;
    activeVisitorsToday : Nat;
    totalVisitorsToday : Nat;
  };

  type VerifyDocumentResult = {
    visitorId : Text;
    name : Text;
    surname : Text;
    visitPurpose : Text;
    visitingPerson : Text;
    phone : Text;
    companyName : Text;
    entryTime : Time.Time;
    exitTime : ?Time.Time;
  };

  type BlacklistEntry = {
    tcId : Text;
    reason : Text;
    addedAt : Time.Time;
  };

  type PreRegistrationStatus = {
    #pending;
    #submitted;
    #finalized;
    #cancelled;
  };

  public type PreRegistration = {
    inviteCode : Text;
    companyId : Text;
    createdBy : Text;
    visitingPerson : Text;
    visitPurpose : Text;
    visitorName : ?Text;
    visitorSurname : ?Text;
    tcId : ?Text;
    phone : ?Text;
    createdAt : Time.Time;
    status : PreRegistrationStatus;
    visitorId : ?Text;
  };

  type VehicleAccess = {
    vehiclePlate : Text;
    visitorId : Text;
    accessTime : Time.Time;
  };

  // Persistent storage
  let companies = Map.empty<Text, Company>();
  let employees = Map.empty<Text, Employee>();
  let companyEmployees = Map.empty<Text, EmployeeRole>();
  let visitors = Map.empty<Text, Visitor>();
  let activeVisitors = Set.empty<Text>();
  let documentCodeToVisitorId = Map.empty<Text, Text>();
  let principalToEmployeeId = Map.empty<Principal, Text>();
  let companyLogos = Map.empty<Text, Text>();
  let preRegistrations = Map.empty<Text, PreRegistration>();
  let employeePins = Map.empty<Text, Text>();
  let companyBlacklist = Map.empty<Text, BlacklistEntry>();
  let vehicleAccessRecords = Map.empty<Text, VehicleAccess>();

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

  // Helper: check if a timestamp is from today (UTC)
  func isToday(ts : Time.Time) : Bool {
    let now = Time.now();
    let dayNs : Int = 86_400_000_000_000; // 1 day in nanoseconds
    let startOfToday = now - (now % dayNs);
    ts >= startOfToday and ts < startOfToday + dayNs;
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
    // Require at least guest permission to prevent anonymous spam
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

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
    // Public login endpoint - no auth required for login operations
    for ((_, company) in companies.entries()) {
      if (company.loginCode == loginCode) {
        return ?company;
      };
    };
    null;
  };

  public shared ({ caller }) func registerEmployee(name : Text, surname : Text) : async Text {
    // Require at least guest permission to prevent anonymous employee creation
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

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
    // Public login endpoint - no auth required for login operations
    employees.get(employeeId);
  };

  public shared ({ caller }) func addEmployeeToCompany(companyId : Text, employeeId : Text, role : EmployeeRole) : async () {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not isOwnerOrAuthorized(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: Only owner or authorized can add employees");
    };

    switch (companies.get(companyId), employees.get(employeeId)) {
      case (?_, ?_) {
        let key = getCombinedKey(companyId, employeeId);
        companyEmployees.add(key, role);
      };
      case (_) { Runtime.trap("Company or employee not found") };
    };
  };

  public query ({ caller }) func getMyCompanies(employeeId : Text) : async [(Company, EmployeeRole)] {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

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
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

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
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not isOwner(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: Only owner can remove employees");
    };

    let key = getCombinedKey(companyId, targetEmployeeId);
    if (not companyEmployees.containsKey(key)) {
      Runtime.trap("Employee not found in company");
    };
    companyEmployees.remove(key);
  };

  public shared ({ caller }) func registerVisitor(companyId : Text, name : Text, surname : Text, tcId : Text, phone : Text, visitingPerson : Text, visitPurpose : Text, signatureData : Text, vehiclePlate : ?Text) : async Text {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to register visitors");
    };

    // Check if tcId is in blacklist
    switch (companyBlacklist.get(getCombinedKey(companyId, tcId))) {
      case (?_) {
        Runtime.trap("Bu ziyaretçi kara listede");
      };
      case (_) {};
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
      vehiclePlate;
    };
    visitors.add(visitorId, visitor);
    activeVisitors.add(visitorId);
    documentCodeToVisitorId.add(documentCode, visitorId);
    visitorId;
  };

  public shared ({ caller }) func checkoutVisitor(visitorId : Text, companyId : Text) : async () {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

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
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

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
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

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
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

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
    // Public function - no authentication required for document verification
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
              visitingPerson = visitor.visitingPerson;
              phone = visitor.phone;
              companyName;
              entryTime = visitor.entryTime;
              exitTime = visitor.exitTime;
            };
          };
          case (null) { null };
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getCompanyEmployees(companyId : Text) : async [{ employee : Employee; role : EmployeeRole }] {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

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
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not isOwnerOrAuthorized(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: Only owner or authorized can view company stats");
    };

    var totalVisitors = 0;
    var activeVisitorsToday = 0;
    var totalVisitorsToday = 0;

    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == companyId) {
        totalVisitors += 1;
        if (isToday(visitor.entryTime)) {
          totalVisitorsToday += 1;
          switch (visitor.exitTime) {
            case (null) { activeVisitorsToday += 1 };
            case (_) {};
          };
        };
      };
    };

    {
      totalVisitors;
      activeVisitorsToday;
      totalVisitorsToday;
    };
  };

  // New functions with loginCode-based authentication
  // These require at least guest-level authentication to prevent anonymous access

  public query ({ caller }) func getVisitorsAsCompany(loginCode : Text) : async [Visitor] {
    // Require at least guest permission to prevent completely anonymous access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    let companyId = switch (getCompanyIdByLoginCode(loginCode)) {
      case (?id) { id };
      case (null) { Runtime.trap("Invalid login code") };
    };

    var result : [Visitor] = [];
    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == companyId) {
        result := result.concat([visitor]);
      };
    };
    result;
  };

  public query ({ caller }) func getCompanyStatsAsCompany(loginCode : Text) : async ?CompanyStats {
    // Require at least guest permission to prevent completely anonymous access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    switch (getCompanyIdByLoginCode(loginCode)) {
      case (?companyId) {
        ?calculateCompanyStats(companyId);
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getTopVisitedPersons(companyId : Text, limit : Nat) : async [(Text, Nat)] {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company");
    };

    getTopVisitedPersonsInternal(companyId, limit);
  };

  public query ({ caller }) func getTopVisitedPersonsAsCompany(loginCode : Text, limit : Nat) : async [(Text, Nat)] {
    // Require at least guest permission to prevent completely anonymous access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    let companyId = switch (getCompanyIdByLoginCode(loginCode)) {
      case (?id) { id };
      case (null) { Runtime.trap("Invalid login code") };
    };

    getTopVisitedPersonsInternal(companyId, limit);
  };

  public query ({ caller }) func getPurposeDistributionAsCompany(loginCode : Text) : async [(Text, Nat)] {
    // Require at least guest permission to prevent completely anonymous access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    let companyId = switch (getCompanyIdByLoginCode(loginCode)) {
      case (?id) { id };
      case (null) { Runtime.trap("Invalid login code") };
    };

    let purposeCounts = Map.empty<Text, Nat>();

    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == companyId) {
        let currentCount = switch (purposeCounts.get(visitor.visitPurpose)) {
          case (?count) { count };
          case (null) { 0 };
        };
        purposeCounts.add(visitor.visitPurpose, currentCount + 1);
      };
    };

    purposeCounts.toArray();
  };

  // Helper functions for new features
  func getCompanyIdByLoginCode(loginCode : Text) : ?Text {
    for ((companyId, company) in companies.entries()) {
      if (company.loginCode == loginCode) {
        return ?companyId;
      };
    };
    null;
  };

  func calculateCompanyStats(companyId : Text) : CompanyStats {
    var totalVisitors = 0;
    var activeVisitorsToday = 0;
    var totalVisitorsToday = 0;

    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == companyId) {
        totalVisitors += 1;
        if (isToday(visitor.entryTime)) {
          totalVisitorsToday += 1;
          switch (visitor.exitTime) {
            case (null) { activeVisitorsToday += 1 };
            case (_) {};
          };
        };
      };
    };

    {
      totalVisitors;
      activeVisitorsToday;
      totalVisitorsToday;
    };
  };

  func getTopVisitedPersonsInternal(companyId : Text, limit : Nat) : [(Text, Nat)] {
    let personCounts = Map.empty<Text, Nat>();

    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == companyId) {
        let currentCount = switch (personCounts.get(visitor.visitingPerson)) {
          case (?count) { count };
          case (null) { 0 };
        };
        personCounts.add(visitor.visitingPerson, currentCount + 1);
      };
    };

    let sortedList = personCounts.toArray().sort(
      func((_, count1), (_, count2)) {
        if (count1 > count2) { #less } else if (count1 < count2) { #greater } else {
          #equal;
        };
      }
    );

    let resultSize = Nat.min(sortedList.size(), limit);
    sortedList.sliceToArray(0, resultSize);
  };

  // New functions by user request - with proper authorization

  public query ({ caller }) func getVisitorCountByTcId(_companyId : Text, _tcId : Text) : async Nat {
    // Require at least guest permission to prevent completely anonymous access to sensitive TC ID data
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    var count = 0;
    for ((_, visitor) in visitors.entries()) {
      if (visitor.companyId == _companyId and visitor.tcId == _tcId) {
        count += 1;
      };
    };
    count;
  };

  public shared ({ caller }) func setCompanyLogo(loginCode : Text, logoData : Text) : async () {
    // Require at least guest permission to prevent completely anonymous access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    switch (getCompanyIdByLoginCode(loginCode)) {
      case (?companyId) {
        companyLogos.add(companyId, logoData);
      };
      case (null) { Runtime.trap("Invalid login code") };
    };
  };

  public query ({ caller }) func getCompanyLogo(loginCode : Text) : async ?Text {
    // Require at least guest permission to prevent completely anonymous access
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    switch (getCompanyIdByLoginCode(loginCode)) {
      case (?companyId) {
        return companyLogos.get(companyId);
      };
      case (null) { Runtime.trap("Invalid login code") };
    };
  };

  // Employee PIN functionality - FIXED with proper authorization
  public shared ({ caller }) func setEmployeePin(employeeId : Text, pin : Text) : async () {
    // Only the employee themselves can set their own PIN
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (callerEmployeeId != employeeId) {
      Runtime.trap("Unauthorized: You can only set your own PIN");
    };

    switch (employees.get(employeeId)) {
      case (?_) {
        employeePins.add(employeeId, pin);
      };
      case (null) { Runtime.trap("Employee not found") };
    };
  };

  public query ({ caller }) func verifyEmployeePin(employeeId : Text, pin : Text) : async Bool {
    // Only the employee themselves can verify their own PIN
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (callerEmployeeId != employeeId) {
      Runtime.trap("Unauthorized: You can only verify your own PIN");
    };

    switch (employeePins.get(employeeId)) {
      case (?storedPin) {
        storedPin == pin;
      };
      case (null) { false };
    };
  };

  // Company profile update - only callable by company owner
  public shared ({ caller }) func updateCompanyProfile(loginCode : Text, name : Text, sector : Text, address : Text, contactPersonName : Text) : async () {
    let companyId = switch (getCompanyIdByLoginCode(loginCode)) {
      case (?id) { id };
      case (null) { Runtime.trap("Invalid login code") };
    };

    let employeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not isOwner(companyId, employeeId)) {
      Runtime.trap("Unauthorized: Only company owner can update the company profile");
    };

    switch (companies.get(companyId)) {
      case (?existingCompany) {
        let updatedCompany : Company = {
          companyId = existingCompany.companyId;
          loginCode = existingCompany.loginCode;
          name;
          sector;
          address;
          contactPersonName;
          createdAt = existingCompany.createdAt;
        };
        companies.add(companyId, updatedCompany);
      };
      case (null) { Runtime.trap("Company not found") };
    };
  };

  // Get visitors by person for in-panel notification
  public query ({ caller }) func getVisitorsByPerson(companyId : Text, personName : Text) : async [Visitor] {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company");
    };

    let result = visitors.toArray().map(
      func((_, visitor)) { visitor }
    ).filter(
      func(visitor) {
        visitor.companyId == companyId and visitor.visitingPerson == personName
      }
    );
    result;
  };

  // Blacklist functions
  public shared ({ caller }) func addVisitorBlacklist(companyId : Text, tcId : Text, reason : Text) : async () {
    // Only company owner can add to blacklist
    let employeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) {
        Runtime.trap("Unauthorized: Caller is not registered as an employee");
      };
    };

    if (not isOwner(companyId, employeeId)) {
      Runtime.trap("Unauthorized: Only company owner can add to blacklist");
    };

    let entry : BlacklistEntry = {
      tcId;
      reason;
      addedAt = Time.now();
    };

    companyBlacklist.add(getCombinedKey(companyId, tcId), entry);
  };

  public shared ({ caller }) func removeVisitorBlacklist(companyId : Text, tcId : Text) : async () {
    // Only company owner can remove from blacklist
    let employeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not isOwner(companyId, employeeId)) {
      Runtime.trap("Unauthorized: Only company owner can remove from blacklist");
    };

    companyBlacklist.remove(getCombinedKey(companyId, tcId));
  };

  public query ({ caller }) func getCompanyBlacklist(loginCode : Text) : async [BlacklistEntry] {
    let companyId = switch (getCompanyIdByLoginCode(loginCode)) {
      case (?id) { id };
      case (null) { Runtime.trap("Invalid login code") };
    };

    // Verify caller is an employee of this company
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to view the blacklist");
    };

    companyBlacklist.toArray().filter(
      func((key, _)) {
        key.split(#char '_').toArray()[0] == companyId;
      }
    ).map(func((_, entry)) { entry });
  };

  public query ({ caller }) func isVisitorBlacklisted(companyId : Text, tcId : Text) : async Bool {
    // Verify caller is an employee of this company
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to check blacklist status");
    };

    companyBlacklist.containsKey(getCombinedKey(companyId, tcId));
  };

  ///////////////////////
  /// PRE-REGISTRATION SYSTEM WITH PROPER AUTHORIZATION
  ///////////////////////

  // Pre-registration system
  public shared ({ caller }) func createInvite(companyId : Text, visitingPerson : Text, visitPurpose : Text) : async Text {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to create invites");
    };

    let inviteCode = generateRandomText(12);
    let preReg : PreRegistration = {
      inviteCode;
      companyId;
      createdBy = callerEmployeeId;
      visitingPerson;
      visitPurpose;
      visitorName = null;
      visitorSurname = null;
      tcId = null;
      phone = null;
      createdAt = Time.now();
      status = #pending;
      visitorId = null;
    };

    preRegistrations.add(inviteCode, preReg);
    inviteCode;
  };

  public query ({ caller }) func getInvitePublic(inviteCode : Text) : async ?{ visitingPerson : Text; visitPurpose : Text; companyName : Text; status : PreRegistrationStatus } {
    // Public function - no authentication required
    switch (preRegistrations.get(inviteCode)) {
      case (?invite) {
        switch (companies.get(invite.companyId)) {
          case (?company) {
            return ?{
              visitingPerson = invite.visitingPerson;
              visitPurpose = invite.visitPurpose;
              companyName = company.name;
              status = invite.status;
            };
          };
          case (null) { return null };
        };
      };
      case (null) { return null };
    };
  };

  public shared ({ caller }) func submitInviteInfo(inviteCode : Text, visitorName : Text, visitorSurname : Text, tcId : Text, phone : Text) : async () {
    // Public function for visitors - minimal guest check to prevent anonymous abuse
    if (not (AccessControl.hasPermission(accessControlState, caller, #guest))) {
      Runtime.trap("Unauthorized: Authentication required");
    };

    switch (preRegistrations.get(inviteCode)) {
      case (?invite) {
        if (invite.status != #pending) {
          Runtime.trap("Invite is not in pending state");
        };

        let updatedInvite : PreRegistration = {
          invite with
          visitorName = ?visitorName;
          visitorSurname = ?visitorSurname;
          tcId = ?tcId;
          phone = ?phone;
          status = #submitted;
        };
        preRegistrations.add(inviteCode, updatedInvite);
      };
      case (null) { Runtime.trap("Invite not found") };
    };
  };

  public shared ({ caller }) func finalizeInvite(inviteCode : Text, companyId : Text, signatureData : Text, vehiclePlate : ?Text, _visitorType : ?Text, _ndaAccepted : Bool) : async Text {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to finalize invites");
    };

    switch (preRegistrations.get(inviteCode)) {
      case (?invite) {
        if (invite.companyId != companyId) {
          Runtime.trap("Invite does not belong to this company");
        };

        if (invite.status != #submitted) {
          Runtime.trap("Invite is not in submitted state");
        };

        let name = switch (invite.visitorName) {
          case (?n) { n };
          case (null) { Runtime.trap("Missing visitor name") };
        };
        let surname = switch (invite.visitorSurname) {
          case (?s) { s };
          case (null) { Runtime.trap("Missing visitor surname") };
        };
        let tcId = switch (invite.tcId) {
          case (?t) { t };
          case (null) { "" }; // If tcId is absent, use empty string
        };
        let phone = switch (invite.phone) {
          case (?p) { p };
          case (null) { "" };
        };

        // Check if tcId is in blacklist
        if (tcId != "") {
          switch (companyBlacklist.get(getCombinedKey(companyId, tcId))) {
            case (?_) {
              Runtime.trap("Bu ziyaretçi kara listede");
            };
            case (_) {};
          };
        };

        let visitorId = generateRandomText(10);
        let documentCode = generateRandomText(12);
        let visitor = {
          visitorId;
          companyId;
          name;
          surname;
          tcId;
          phone;
          visitingPerson = invite.visitingPerson;
          visitPurpose = invite.visitPurpose;
          entryTime = Time.now();
          exitTime = null;
          signatureData;
          documentCode;
          createdBy = callerEmployeeId;
          vehiclePlate;
        };
        visitors.add(visitorId, visitor);
        activeVisitors.add(visitorId);
        documentCodeToVisitorId.add(documentCode, visitorId);

        let updatedInvite : PreRegistration = {
          invite with
          status = #finalized;
          visitorId = ?visitorId;
        };
        preRegistrations.add(inviteCode, updatedInvite);
        visitorId;
      };
      case (null) { Runtime.trap("Invite not found") };
    };
  };

  public query ({ caller }) func getCompanyInvites(companyId : Text) : async [PreRegistration] {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to view invites");
    };

    let entries = preRegistrations.toArray();
    let result = entries.filter(
      func((_, invite)) { invite.companyId == companyId }
    ).map(func((_, invite)) { invite });
    result;
  };

  public shared ({ caller }) func cancelInvite(inviteCode : Text, companyId : Text) : async () {
    let callerEmployeeId = switch (getEmployeeIdFromCaller(caller)) {
      case (?id) { id };
      case (null) { Runtime.trap("Unauthorized: Caller is not registered as an employee") };
    };

    if (not hasAnyRole(companyId, callerEmployeeId)) {
      Runtime.trap("Unauthorized: You must be an employee of this company to cancel invites");
    };

    switch (preRegistrations.get(inviteCode)) {
      case (?invite) {
        if (invite.companyId != companyId) {
          Runtime.trap("Invite does not belong to this company");
        };
        preRegistrations.add(
          inviteCode,
          { invite with status = #cancelled },
        );
      };
      case (null) { Runtime.trap("Invite not found") };
    };
  };
};
