# Ministry Intranet Portal (SharePoint + Teams)

## 📝 Project Summary

This project simulates a modern intranet portal for a ministry, using SharePoint Online and Microsoft Teams to centralize communication, document sharing, and collaboration across departments.

## 🧩 Features Implemented

* **SharePoint Communication Site** with a custom homepage, departmental quick links, and calendar web parts.
* **Document Libraries** organized by department with custom metadata and versioning.
* **Microsoft Teams Integration** with dedicated channels for HR, Finance, IT, and Legal.
* **OneDrive Syncing** for offline access to shared documents.
* **Automated Announcements** using Power Automate to notify Teams channels and Outlook when news is published.

## 🛠️ Technologies Used

* SharePoint Online
* Microsoft Teams
* OneDrive for Business
* Power Automate

## 📁 Folder Contents

```
01-intranet-portal/
├── site-schema.json                # SharePoint site structure export (mock)
├── screenshots/                    # UI mockups: homepage, libraries, Teams
├── announcement-flow.zip           # Power Automate flow export (mock)
├── department-metadata.xlsx        # Example metadata for libraries
└── README.md
```

## 📸 Sample Screenshots

* `home-page.png` – Custom SharePoint intranet homepage with ministry branding
* `document-library.png` – HR document library showing metadata & versioning
* `teams-channels.png` – Microsoft Teams with integrated document tab

## ✅ Skills Demonstrated

* SharePoint customization and site structure design
* Teams channel configuration and governance
* Document management and OneDrive integration
* Power Automate flow design for automated notifications

## 📘 Documentation & Notes

* See `department-metadata.xlsx` for the taxonomy used in library tagging.
* The Power Automate flow triggers when a new news item is published to the homepage and pushes alerts to a Teams channel and department-wide email group.

## 📌 Future Enhancements

* Add Power BI integration for intranet usage analytics
* Expand language localization support for bilingual content

> ⚠️ Note: All configurations and screenshots are based on simulated or anonymized data.