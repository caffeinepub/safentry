import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Time "mo:core/Time";

module {
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
    createdBy : Text;
    vehiclePlate : ?Text;
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

  type PreRegistration = {
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

  type AuditLog = {
    logId : Text;
    companyId : Text;
    action : Text;
    performedBy : Text;
    targetId : Text;
    details : Text;
    timestamp : Time.Time;
  };

  type OldActor = {
    companies : Map.Map<Text, Company>;
    employees : Map.Map<Text, Employee>;
    companyEmployees : Map.Map<Text, EmployeeRole>;
    visitors : Map.Map<Text, Visitor>;
    activeVisitors : Set.Set<Text>;
    documentCodeToVisitorId : Map.Map<Text, Text>;
    principalToEmployeeId : Map.Map<Principal, Text>;
    companyLogos : Map.Map<Text, Text>;
    preRegistrations : Map.Map<Text, PreRegistration>;
    employeePins : Map.Map<Text, Text>;
    companyBlacklist : Map.Map<Text, BlacklistEntry>;
    vehicleAccessRecords : Map.Map<Text, VehicleAccess>;
    userProfiles : Map.Map<Principal, {
      employeeId : ?Text;
      name : Text;
      surname : Text;
    }>;
  };

  type NewActor = {
    companies : Map.Map<Text, Company>;
    employees : Map.Map<Text, Employee>;
    companyEmployees : Map.Map<Text, EmployeeRole>;
    visitors : Map.Map<Text, Visitor>;
    activeVisitors : Set.Set<Text>;
    documentCodeToVisitorId : Map.Map<Text, Text>;
    principalToEmployeeId : Map.Map<Principal, Text>;
    companyLogos : Map.Map<Text, Text>;
    preRegistrations : Map.Map<Text, PreRegistration>;
    employeePins : Map.Map<Text, Text>;
    companyBlacklist : Map.Map<Text, BlacklistEntry>;
    vehicleAccessRecords : Map.Map<Text, VehicleAccess>;
    auditLogs : Map.Map<Text, AuditLog>;
    userProfiles : Map.Map<Principal, {
      employeeId : ?Text;
      name : Text;
      surname : Text;
    }>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      auditLogs = Map.empty<Text, AuditLog>();
    };
  };
};
