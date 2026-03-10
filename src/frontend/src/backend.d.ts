import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Company {
    loginCode: string;
    name: string;
    createdAt: Time;
    sector: string;
    address: string;
    contactPersonName: string;
    companyId: string;
}
export type Time = bigint;
export interface VerifyDocumentResult {
    exitTime?: Time;
    entryTime: Time;
    visitingPerson: string;
    name: string;
    surname: string;
    visitorId: string;
    companyName: string;
    visitPurpose: string;
    phone: string;
}
export interface BlacklistEntry {
    tcId: string;
    addedAt: Time;
    reason: string;
}
export interface Employee {
    name: string;
    createdAt: Time;
    surname: string;
    employeeId: string;
}
export interface Visitor {
    documentCode: string;
    exitTime?: Time;
    entryTime: Time;
    visitingPerson: string;
    vehiclePlate?: string;
    name: string;
    createdBy: string;
    tcId: string;
    surname: string;
    visitorId: string;
    signatureData: string;
    visitPurpose: string;
    phone: string;
    companyId: string;
}
export interface PreRegistration {
    status: PreRegistrationStatus;
    visitingPerson: string;
    createdAt: Time;
    createdBy: string;
    tcId?: string;
    visitorId?: string;
    visitorName?: string;
    inviteCode: string;
    visitPurpose: string;
    phone?: string;
    visitorSurname?: string;
    companyId: string;
}
export interface UserProfile {
    name: string;
    surname: string;
    employeeId?: string;
}
export interface CompanyStats {
    activeVisitorsToday: bigint;
    totalVisitors: bigint;
    totalVisitorsToday: bigint;
}
export enum EmployeeRole {
    owner = "owner",
    authorized = "authorized",
    registrar = "registrar"
}
export enum PreRegistrationStatus {
    cancelled = "cancelled",
    submitted = "submitted",
    pending = "pending",
    finalized = "finalized"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addEmployeeToCompany(companyId: string, employeeId: string, role: EmployeeRole): Promise<void>;
    addVisitorBlacklist(companyId: string, tcId: string, reason: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    cancelInvite(inviteCode: string, companyId: string): Promise<void>;
    checkoutVisitor(visitorId: string, companyId: string): Promise<void>;
    /**
     * / PRE-REGISTRATION SYSTEM WITH PROPER AUTHORIZATION
     */
    createInvite(companyId: string, visitingPerson: string, visitPurpose: string): Promise<string>;
    finalizeInvite(inviteCode: string, companyId: string, signatureData: string, vehiclePlate: string | null, _visitorType: string | null, _ndaAccepted: boolean): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getCompanyBlacklist(loginCode: string): Promise<Array<BlacklistEntry>>;
    getCompanyEmployees(companyId: string): Promise<Array<{
        role: EmployeeRole;
        employee: Employee;
    }>>;
    getCompanyInvites(companyId: string): Promise<Array<PreRegistration>>;
    getCompanyLogo(loginCode: string): Promise<string | null>;
    getCompanyStats(companyId: string): Promise<CompanyStats>;
    getCompanyStatsAsCompany(loginCode: string): Promise<CompanyStats | null>;
    getInvitePublic(inviteCode: string): Promise<{
        status: PreRegistrationStatus;
        visitingPerson: string;
        companyName: string;
        visitPurpose: string;
    } | null>;
    getMyCompanies(employeeId: string): Promise<Array<[Company, EmployeeRole]>>;
    getPurposeDistributionAsCompany(loginCode: string): Promise<Array<[string, bigint]>>;
    getTopVisitedPersons(companyId: string, limit: bigint): Promise<Array<[string, bigint]>>;
    getTopVisitedPersonsAsCompany(loginCode: string, limit: bigint): Promise<Array<[string, bigint]>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    getVisitorById(visitorId: string, companyId: string): Promise<Visitor | null>;
    getVisitorCountByTcId(_companyId: string, _tcId: string): Promise<bigint>;
    getVisitors(companyId: string): Promise<Array<Visitor>>;
    getVisitorsAsCompany(loginCode: string): Promise<Array<Visitor>>;
    getVisitorsByPerson(companyId: string, personName: string): Promise<Array<Visitor>>;
    isCallerAdmin(): Promise<boolean>;
    isVisitorBlacklisted(companyId: string, tcId: string): Promise<boolean>;
    loginCompany(loginCode: string): Promise<Company | null>;
    loginEmployee(employeeId: string): Promise<Employee | null>;
    registerCompany(name: string, sector: string, address: string, contactPersonName: string): Promise<{
        loginCode: string;
        companyId: string;
    }>;
    registerEmployee(name: string, surname: string): Promise<string>;
    registerVisitor(companyId: string, name: string, surname: string, tcId: string, phone: string, visitingPerson: string, visitPurpose: string, signatureData: string, vehiclePlate: string | null): Promise<string>;
    removeEmployeeFromCompany(companyId: string, targetEmployeeId: string): Promise<void>;
    removeVisitorBlacklist(companyId: string, tcId: string): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setCompanyLogo(loginCode: string, logoData: string): Promise<void>;
    setEmployeePin(employeeId: string, pin: string): Promise<void>;
    setEmployeeRole(companyId: string, targetEmployeeId: string, role: EmployeeRole): Promise<void>;
    submitInviteInfo(inviteCode: string, visitorName: string, visitorSurname: string, tcId: string, phone: string): Promise<void>;
    updateCompanyProfile(loginCode: string, name: string, sector: string, address: string, contactPersonName: string): Promise<void>;
    updateVisitorSignature(visitorId: string, companyId: string, signatureData: string): Promise<void>;
    verifyDocument(documentCode: string): Promise<VerifyDocumentResult | null>;
    verifyEmployeePin(employeeId: string, pin: string): Promise<boolean>;
}
