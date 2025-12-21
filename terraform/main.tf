terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
      version = "6.26.0"
    }
    random = {
      source = "hashicorp/random"
      version = "3.7.2"
    }
  }
}

provider "aws" {
  region = var.region
}

variable "ui_manifest" {
  description = "The infrastructure manifest sent from the UI Orchestrator"
  type        = any 
}