# Ministry Intranet Portal (SharePoint + Teams)

## 📝 Project Summary

This project simulates a modern intranet portal for a ministry, using SharePoint Online and Microsoft Teams to centralize communication, document sharing, and collaboration across departments.

## 🧩 Features Implemented

* **SharePoint Communication Site**: Custom homepage with Hero web parts, departmental quick links, and dynamic news.
* **Intelligent Document Libraries**: Metadata-driven organization (using `department-metadata.xlsx`) with versioning and sensitivity labeling.
* **Microsoft Teams Integration**: Seamless collaboration with dedicated channels for HR, Finance, IT, and Legal, featuring integrated SharePoint tabs.
* **Advanced Governance**: Pre-defined permission levels (Admin, Editor, Reader) and content lifecycle management as detailed in `site-schema.json`.
* **Automated Announcements**: Power Automate workflows that trigger on news publication, pushing alerts to Teams and Outlook.

## 🛠️ Technologies Used

* SharePoint Online
* Microsoft Teams
* OneDrive for Business
* Power Automate

## 📁 Folder Contents

```
01-intranet-portal/
├── site-schema.json                # Comprehensive SharePoint site structure & governance
├── announcement-formatting.json    # JSON formatting for the Announcements list
├── document-library-formatting.json # JSON column formatting for HR Documents
├── contacts-formatting.json        # JSON view formatting for Department Contacts
├── screenshots/                    # UI mockups: homepage, libraries, Teams
├── announcement-flow.zip           # Power Automate flow export (logic template)
├── department-metadata.xlsx        # Taxonomy and metadata schema
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

* **Governance Framework**: Detailed permission models and lifecycle policies are documented in [GOVERNANCE.md](./GOVERNANCE.md).
* **Metadata Schema**: See `department-metadata.xlsx` for the taxonomy used in library tagging.
* **Automation Logic**: The Power Automate flow triggers when a new news item is published to the homepage and pushes alerts to a Teams channel and department-wide email group.

## 📌 Future Enhancements

* Add Power BI integration for intranet usage analytics
* Expand language localization support for bilingual content

> ⚠️ Note: All configurations and screenshots are based on simulated or anonymized data.
