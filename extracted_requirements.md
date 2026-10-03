HOME HEALTHCARE PLATFORM

Product Requirement Specification (PRS)

Version 1.0 | MVP

1. Product Overview

A home healthcare marketplace that allows patients or family members to discover, book, pay for, and track healthcare services delivered at the patient's home. Verified doctors, nurses, physicians/assistants and other healthcare professionals can register, submit certifications, receive assigned service requests, visit patients, and complete services.

2. Goals

Enable patients to request healthcare services from home.

Provide verified healthcare professionals for home visits.

Support online payment, primarily UPI, before service confirmation.

Use location and service requirements to assign suitable professionals.

Provide transparent booking and service-status tracking.

Give administrators complete control over users, professionals, services, pricing, payments and assignments.

3. User Roles

Patient / Family Member – registers, searches services, books services, pays, tracks requests and views service history.

Healthcare Professional – doctor, nurse, physician assistant, etc.; registers, uploads credentials, manages availability and completes assigned visits.

Admin – verifies professionals, manages services/pricing, assigns professionals, verifies payments, handles cancellations/refunds and monitors operations.

Operations / Support – optional role for handling assignments, customer support and escalations.

4. Professional Registration & Verification

Professional registration with name, phone, email and professional type.

Professional profile with qualification, specialization, experience and service area.

Upload professional certificates, registration/license documents and identity documents.

Admin review workflow: Pending → Under Review → Approved / Rejected.

Only approved professionals can receive service assignments.

Professional availability, working hours and service radius.

Profile status: Available, Busy, Offline, Suspended.

5. Patient Registration

Mobile/email-based registration and login.

Patient profile: name, age/date of birth, gender, phone and emergency contact.

Multiple patient profiles can be maintained under one family account.

Save one or more home addresses.

Basic medical information and notes may be captured when required for a service.

6. Service Marketplace

Home Nursing.

Wound Dressing / Dressing Assistance.

Doctor Home Visit.

Physician / Physician Assistant Home Visit.

Injection / Medication Administration where legally and clinically permitted.

Sample Collection / Lab Services.

Pharmacy / Medication Delivery.

Ambulance Request.

Additional services can be added through the admin panel.

7. Service Booking Flow

Patient flow:

Login / Continue as patient.

Select patient.

Select required service.

Enter service details and clinical requirements.

Select address.

Select preferred date/time.

View service price and applicable charges.

Proceed to UPI/online payment.

Payment verification.

Booking created.

Suitable professional is assigned.

Patient receives assignment and visit details.

Professional accepts the request.

Professional travels to patient location.

Service starts and status is updated.

Service is completed.

Patient receives completion summary and invoice/receipt.

8. Payment Requirements

Display service fee before payment.

Support UPI and online payment gateway.

Payment status: Pending, Initiated, Paid, Failed, Refunded.

Booking should be confirmed only after successful payment verification, subject to admin configuration.

Generate payment receipt/invoice.

Support cancellation and refund rules.

Maintain complete payment transaction history.

9. Professional Assignment

Match professionals based on service type, qualification, approval status, availability and service area.

Distance from patient can be used as an assignment factor.

Admin can manually assign or reassign a professional.

Professional receives a new assignment notification.

Professional can Accept or Reject based on configured rules.

Rejected/unaccepted requests can return to the assignment queue.

Patient is notified when assignment changes.

10. Booking Status

Payment Pending

Payment Confirmed

Searching for Professional

Professional Assigned

Professional Accepted

On the Way

Arrived

Service Started

Service Completed

Cancelled

Refunded

11. Home Visit

Professional views patient and booking details.

Navigation/location support.

Start Visit action.

Capture required service details, notes, vitals or procedure information.

Upload supporting documents/images where required and permitted.

End Visit / Complete Service action.

Generate service completion summary.

Patient can view the completed service record.

12. Pharmacy Module

Patient searches or requests medications.

Upload prescription where required.

Prescription validation workflow.

Show medicine availability and price.

Online payment.

Order confirmation and delivery tracking.

Order history and invoices.

13. Ambulance Module

Patient selects ambulance requirement.

Capture pickup location, destination and emergency details.

Show available ambulance/service options.

Request and assignment workflow.

Real-time status updates.

Emergency contact notification.

Pricing/payment according to configured business rules.

14. Notifications

OTP/login notifications.

Booking confirmation.

Payment confirmation.

Professional assignment.

Professional acceptance/rejection.

Professional arrival/on-the-way updates.

Service completion.

Cancellation/refund.

Push notifications, SMS, email and WhatsApp can be added based on provider integration.

15. Patient App / Website Screens

Landing / Home

Login / Registration

Patient & Family Profiles

Service Categories

Service Details

Book a Service

Address Selection

Date & Time Selection

Order Summary

Payment

Booking Tracking

Professional Details

Service History

Invoices / Receipts

Pharmacy

Ambulance

Notifications

Profile & Settings

Help & Support

16. Professional Portal

Login

Profile

Credential/Certificate Upload

Verification Status

Availability

Service Area

Incoming Requests

Assignment Details

Patient Details

Navigation

Visit Workflow

Clinical/Service Notes

Completed Services

Earnings / Payment History

Notifications

Support

17. Admin Portal

Dashboard with users, bookings, revenue, professionals and pending verification.

Patient management.

Professional management and credential verification.

Service category management.

Pricing and commission configuration.

Booking management.

Professional assignment/reassignment.

Payment and refund management.

Pharmacy order management.

Ambulance request management.

Notifications.

Reports and analytics.

Complaints/support management.

Audit logs.

18. Core Data Entities

User

Patient

Family Account

Professional

Professional Credential

Address

Service

Service Category

Booking

Assignment

Visit

Payment

Refund

Prescription

Pharmacy Order

Ambulance Request

Notification

Invoice

Review/Rating

Support Ticket

Audit Log

19. Security & Compliance

Role-based access control.

Secure authentication and session management.

Encrypt sensitive data in transit and at rest where applicable.

Restrict patient data to authorized users.

Maintain access and audit logs.

Professional credentials must be verified before activation.

Healthcare data handling must comply with applicable local laws, regulations and platform policies.

Payment card/UPI-sensitive information should be handled through the payment provider rather than stored unnecessarily.

20. MVP Scope

Patient registration/login.

Professional registration and certificate upload.

Admin professional verification.

Home Nursing and Dressing as initial services.

Service selection and booking.

Address and schedule selection.

UPI/online payment.

Professional assignment.

Booking status tracking.

Professional home-visit workflow.

Admin dashboard.

Notifications.

Service history and invoice.

21. Phase 2

Doctor/physician home visits.

Physician assistant services.

Pharmacy and prescription ordering.

Lab/sample collection.

Ambulance booking.

Ratings and reviews.

Advanced location-based auto-assignment.

Wallet/referral/coupon system.

Subscription or membership plans.

22. Phase 3 – Advanced Features

Real-time professional tracking.

AI-assisted service recommendations.

Digital care plans.

Recurring home-care bookings.

Family healthcare dashboard.

Teleconsultation.

Integration with labs, pharmacies and ambulance providers.

Advanced analytics and operational dashboards.

23. Recommended Initial Architecture

Patient Web/Mobile Application.

Professional Mobile Application.

Admin Web Dashboard.

Backend REST APIs.

Relational database.

Object storage for certificates and permitted documents.

Payment gateway integration.

Push notification service.

Maps/location service.

Role-based authentication and audit logging.

24. Key Business Rules

Unverified professionals cannot accept bookings.

A booking requires a valid patient, service, address and schedule.

Payment status must be validated before confirmed service assignment when prepaid booking is configured.

Only suitable and available professionals can be assigned.

Every assignment/status/payment change must be recorded.

Cancellation and refund behavior must be configurable by service.

Emergency services such as ambulance should have a separate priority workflow.

25. Success Criteria

Patient can complete a service booking without staff assistance.

Admin can verify and activate professionals.

Admin can assign/reassign professionals.

Professional can accept, perform and complete a home visit.

Payment and booking states remain synchronized.

Patient can track the complete booking lifecycle.

All critical actions are auditable.