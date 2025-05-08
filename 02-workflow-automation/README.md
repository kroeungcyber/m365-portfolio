# Workflow Automation for Leave Requests (Power Platform)

## 📝 Project Summary

This project automates the employee leave request process using Power Apps, Power Automate, and SharePoint, demonstrating end-to-end workflow automation capabilities in Microsoft 365.

## 🧩 Features Implemented

* **Power Apps Canvas App** for employee leave request submissions with form validation
* **Multi-stage Approval Workflow** (employee → manager → HR) using Power Automate
* **SharePoint List Integration** for tracking leave requests and statuses
* **Notifications** via Teams and Outlook at each approval stage
* **Calendar Integration** showing approved leave dates

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