import Map "mo:core/Map";
import Set "mo:core/Set";
import Text "mo:core/Text";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  public type Company = {
    companyId : Text;
    loginCode : Text;
    name : Text;
    sector : Text;
    address : Text;
    contactPersonName : Text;
    createdAt : Time.Time;
  };

  public type Visitor = {
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

  // Old actor type
  public type OldActor = {
    companies : Map.Map<Text, Company>;
    employees : Map.Map<Text, {
      employeeId : Text;
      name : Text;
      surname : Text;
      createdAt : Time.Time;
    }>;
    companyEmployees : Map.Map<Text, { #owner; #authorized; #registrar }>;
    visitors : Map.Map<Text, Visitor>;
    activeVisitors : Set.Set<Text>;
    documentCodeToVisitorId : Map.Map<Text, Text>;
    principalToEmployeeId : Map.Map<Principal, Text>;
    companyLogos : Map.Map<Text, Text>;
  };

  // New actor type
  public type NewActor = {
    companies : Map.Map<Text, Company>;
    employees : Map.Map<Text, {
      employeeId : Text;
      name : Text;
      surname : Text;
      createdAt : Time.Time;
    }>;
    companyEmployees : Map.Map<Text, { #owner; #authorized; #registrar }>;
    visitors : Map.Map<Text, Visitor>;
    activeVisitors : Set.Set<Text>;
    documentCodeToVisitorId : Map.Map<Text, Text>;
    principalToEmployeeId : Map.Map<Principal, Text>;
    companyLogos : Map.Map<Text, Text>;
    employeePins : Map.Map<Text, Text>;
  };

  public func run(old : OldActor) : NewActor {
    {
      old with
      employeePins = Map.empty<Text, Text>()
    };
  };
};
