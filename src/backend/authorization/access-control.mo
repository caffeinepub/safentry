import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";

module {
  public type UserRole = { #admin; #user; #guest };

  public type AccessControlState = {
    userRoles : Map.Map<Principal, UserRole>;
    var adminAssigned : Bool;
  };

  public func initState() : AccessControlState {
    {
      userRoles = Map.empty<Principal, UserRole>();
      var adminAssigned = false;
    };
  };

  public func initialize(state : AccessControlState, caller : Principal, adminToken : Text, userProvidedToken : Text) {
    if (not state.adminAssigned and userProvidedToken == adminToken) {
      state.userRoles.add(caller, #admin);
      state.adminAssigned := true;
    } else {
      state.userRoles.add(caller, #user);
    };
  };

  public func getUserRole(state : AccessControlState, caller : Principal) : UserRole {
    if (caller.isAnonymous()) { return #guest };
    switch (state.userRoles.get(caller)) {
      case (?role) { role };
      case (null) {
        // Unknown (unregistered) principals are treated as guests
        // so that public endpoints like registerCompany work correctly
        #guest
      };
    };
  };

  public func assignRole(state : AccessControlState, caller : Principal, user : Principal, role : UserRole) {
    if (not (isAdmin(state, caller))) {
      Runtime.trap("Unauthorized: Only admins can assign user roles");
    };
    state.userRoles.add(user, role);
  };

  public func hasPermission(state : AccessControlState, caller : Principal, requiredRole : UserRole) : Bool {
    let userRole = getUserRole(state, caller);
    if (userRole == #admin or requiredRole == #guest) { true } else {
      userRole == requiredRole;
    };
  };

  public func isAdmin(state : AccessControlState, caller : Principal) : Bool {
    getUserRole(state, caller) == #admin;
  };
};
