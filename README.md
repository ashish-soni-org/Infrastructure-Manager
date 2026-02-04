🚀 Enterprise-Grade Cloud Provisioning & Configuration 

**"Infrastructure is not just code; it is the blueprint of reliability."**

## 📖 Overview

Welcome to the **Unified Infrastructure Automation Suite**. This repository demonstrates a production-ready approach to orchestrating cloud resources using **Terraform** for provisioning and **Ansible** for configuration management.

Unlike standard setups, this project focuses on **immutability**, **security compliance**, and **dynamic scalability**. It is designed to solve the "Configuration Drift" problem and bridge the gap between infrastructure creation and application deployment without manual intervention.

### 🎯 Key Objectives Achieved

- **Zero-Touch Provisioning:** Full end-to-end automation from `git push` to live application.
- **Dynamic Inventory Bridge:** Ansible automatically detects resources created by Terraform—no manual IP handling.
- **Modular Architecture:** DRY (Don't Repeat Yourself) principles applied to both Terraform modules and Ansible roles.
- **Security as Code:** Integrated `tfsec` scanning and `ansible-vault` for secret encryption.

---

## 🏗️ Architecture Visualization

*(Add your architecture diagram here: Terraform State -> Provision EC2/VPC -> Ansible Dynamic Inventory -> Configure OS/App)*

The workflow follows a strict **DevSecOps** pattern:

1. **Terraform** provisions the VPC, Subnets, Security Groups, and EC2 instances.
2. **State Locking** ensures team collaboration safety using S3 and DynamoDB.
3. **Ansible** reads the Terraform State to identify target hosts dynamically.
4. **Playbooks** harden the OS, install dependencies (Docker/Nginx), and deploy the application.

---

## 🛠️ Technology Stack

| Component             | Tool                  | Description                                  |
| :-------------------- | :-------------------- | :------------------------------------------- |
| **IaC**         | Terraform             | Modular infrastructure provisioning on AWS.  |
| **Config Mgmt** | Ansible               | Idempotent configuration and app deployment. |
| **Cloud**       | AWS                   | Hosting environment (EC2, VPC, IAM, S3).     |
| **CI/CD**       | GitHub Actions        | Automated linting, planning, and applying.   |
| **Security**    | Tfsec & Ansible Vault | Static code analysis and secret management.  |

---

## 📂 Repository Structure

This structure is optimized for readability and scalability:

```bash
.
├── 📂 terraform/               # Infrastructure Definition
│   ├── modules/                # Reusable modules (VPC, EC2, SG)
│   ├── main.tf                 # Entry point
│   ├── variables.tf            # Parameterized inputs
│   └── backend.tf              # Remote state configuration (S3)
├── 📂 ansible/                 # Configuration Management
│   ├── roles/                  # Specialized tasks (webserver, db, security)
│   ├── playbooks/              # Orchestration logic
│   └── dynamic_inventory.py    # The bridge between TF and Ansible
├── 📂 .github/workflows/       # CI/CD Pipelines
└── README.md                   # You are here
```
