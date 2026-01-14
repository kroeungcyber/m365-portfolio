# Workflow Automation for Leave Requests (Power Platform)

## 📝 Project Summary

This project automates the employee leave request process using Power Apps, Power Automate, and SharePoint, demonstrating end-to-end workflow automation capabilities in Microsoft 365.

## 🧩 Features Implemented

* **Power Apps Canvas App**: User-friendly interface for leave submissions with dynamic form validation and data filtering.
* **Multi-stage Approval Workflow**: Advanced Power Automate logic implementing sequential and parallel approvals (Employee → Manager → HR).
* **SharePoint List Backend**: Structured data storage using SharePoint lists with specialized column formatting for status tracking.
* **Omnichannel Notifications**: Real-time alerts delivered via Microsoft Teams Adaptive Cards and customized Outlook emails.
* **Auto-Calendar Integration**: Automatically updates Outlook and SharePoint calendars upon final request approval.

## 🛠️ Technologies Used

* Power Apps
* Power Automate
* SharePoint Online
* Microsoft Teams
* Outlook Calendar

## 📁 Folder Contents

```
02-workflow-automation/
├── leave-request-app.msapp       # Power Apps export (mock)
├── approval-flow.zip            # Power Automate flow export (mock)
├── screenshots/                 # UI mockups: app, approval steps, calendar
├── list-schema.json             # SharePoint list structure (mock)
└── README.md
```

## ✅ Skills Demonstrated

* Power Platform solution architecture
* Form design and user experience optimization
* Workflow automation and business process mapping
* SharePoint list design and integration
* Notification system configuration

## 📘 Documentation & Notes

* The approval flow includes conditional logic for different leave types (vacation, sick, personal)
* Managers receive Teams notifications for pending approvals
* HR maintains a master SharePoint list of all leave requests

## 📌 Future Enhancements

* Add manager delegation capabilities
* Integrate with HR system via API
* Add reporting dashboard for leave trends

> ⚠️ Note: All configurations and screenshots use simulated data
