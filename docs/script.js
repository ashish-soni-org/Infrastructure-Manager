"use strict";

/**
 * Professional Cloud Resource Provisioning Interface
 * Version: 3.2.0
 * Architecture: Decoupled UI & CI/CD Orchestration
 */
(function () {
    const MIN = 1;
    const MAX = 5;
    const THEME_KEY = "provision_theme_v3";
    const AVAILABLE_SERVICES = ["Self-Hosted-Runner", "NGINX", "Docker", "MiniKube", "Map Domain", "SSL Certified"];

    const state = {
        vpcs: [{
            name: "production-vpc",
            subnets: [createDefaultSubnet("main-subnet")]
        }],
        token: "",
        isProvisioning: false
    };

    /* Theme Engine */
    const body = document.body;
    const themeToggleBtn = document.getElementById("themeToggleBtn");

    function applyTheme(theme) {
        body.setAttribute("data-theme", theme);
        themeToggleBtn.textContent = theme === "dark" ? "☀️ Light" : "🌙 Dark";
    }

    applyTheme(localStorage.getItem(THEME_KEY) || "dark");

    themeToggleBtn.onclick = () => {
        const next = body.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem(THEME_KEY, next);
        applyTheme(next);
    };

    /* Manifest Generation Logic */
    function generateManifest() {
        return state.vpcs.map(vpc => ({
            vpc_name: vpc.name,
            subnets: vpc.subnets.map(sn => ({
                subnet_name: sn.name,
                resources: Object.entries(sn.resources)
                    .filter(([_, r]) => r.enabled)
                    .map(([type, r]) => ({
                        type,
                        count: r.count,
                        instances: r.instances.map(inst => ({
                            name: inst.name,
                            services: inst.services,
                            ...(inst.services.includes("Map Domain") ? { domain: inst.domainName } : {}),
                            ...(inst.services.includes("SSL Certified") ? { ssl_email: inst.domainEmail } : {})
                        }))
                    }))
            }))
        }));
    }

    /* Manifest Viewer Logic */
    const manifestViewer = document.getElementById("manifestViewer");
    const copyBtn = document.getElementById("copyManifestBtn");

    function updateManifest() {
        const cleanManifest = generateManifest();
        manifestViewer.textContent = JSON.stringify(cleanManifest, null, 4);
    }

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(manifestViewer.textContent);
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = original, 2000);
    };

    /* Rendering Engine */
    const vpcContainer = document.getElementById("vpcContainer");
    const footerContainer = document.getElementById("footerContainer");
    const vpcCounterValue = document.getElementById("vpcCounterValue");

    function render() {
        vpcContainer.innerHTML = "";
        footerContainer.innerHTML = "";

        vpcCounterValue.textContent = state.vpcs.length;
        document.getElementById("vpcDecrementBtn").disabled = state.vpcs.length <= MIN;
        document.getElementById("vpcIncrementBtn").disabled = state.vpcs.length >= MAX;

        state.vpcs.forEach((vpc, vpcIdx) => {
            const vpcCard = document.createElement("div");
            vpcCard.className = "vpc-card";

            const vpcRow = document.createElement("div");
            vpcRow.className = "row";
            vpcRow.append(createLabel("VPC Name:"), createInput(vpc.name, `VPC_${vpcIdx + 1}`, val => { vpc.name = val; updateManifest(); }));

            const subnetCtrl = document.createElement("div");
            subnetCtrl.className = "row";
            subnetCtrl.append(
                createLabel("Subnets:"),
                createCounterValue(vpc.subnets.length),
                createButton("−", "btn-decrement", vpc.subnets.length <= MIN, () => { vpc.subnets.pop(); render(); }),
                createButton("+", "btn-increment", vpc.subnets.length >= MAX, () => { vpc.subnets.push(createDefaultSubnet()); render(); }),
                createButton("Reset", "btn-reset", false, () => { vpc.subnets = [createDefaultSubnet()]; render(); })
            );

            vpcCard.append(vpcRow, subnetCtrl);

            vpc.subnets.forEach((subnet, subnetIdx) => {
                const snCard = document.createElement("div");
                snCard.className = "subnet-card";
                const snRow = document.createElement("div");
                snRow.className = "row";
                snRow.append(createLabel("Subnet Name:"), createInput(subnet.name, `Subnet_${subnetIdx + 1}`, val => { subnet.name = val; updateManifest(); }));
                snCard.append(snRow, renderResources(subnet));
                vpcCard.appendChild(snCard);
            });

            vpcContainer.appendChild(vpcCard);
        });

        renderFooter();
        updateManifest();
    }

    function renderResources(subnet) {
        const resCard = document.createElement("div");
        resCard.className = "resources-card";

        const chips = document.createElement("div");
        chips.className = "resource-chips";
        ["EC2", "S3", "ECR"].forEach(type => {
            const chip = document.createElement("div");
            chip.className = "chip" + (subnet.resources[type].enabled ? " active" : "");
            chip.textContent = type;
            chip.onclick = () => { subnet.resources[type].enabled = !subnet.resources[type].enabled; render(); };
            chips.appendChild(chip);
        });

        resCard.append(chips);

        Object.entries(subnet.resources).forEach(([type, data]) => {
            if (!data.enabled) return;
            while (data.instances.length < data.count) {
                data.instances.push({ name: "", services: [], domainName: "", domainEmail: "" });
            }
            data.instances.length = data.count;

            const instCard = document.createElement("div");
            instCard.className = "resource-instance-card";
            const ctrl = document.createElement("div");
            ctrl.className = "row";
            ctrl.append(
                createLabel(`${type} Instances:`),
                createCounterValue(data.count),
                createButton("−", "btn-decrement", data.count <= MIN, () => { data.count--; render(); }),
                createButton("+", "btn-increment", data.count >= MAX, () => { data.count++; render(); })
            );

            const list = document.createElement("div");
            data.instances.forEach((inst, idx) => {
                const item = document.createElement("div");
                item.style.marginTop = "10px";
                const row = document.createElement("div");
                row.className = "row";
                row.append(createLabel(`${idx + 1}. Name:`), createInput(inst.name, `${type}_${idx + 1}`, v => { inst.name = v; updateManifest(); }));
                item.append(row);
                if (type === "EC2") item.appendChild(renderServicesCard(inst));
                list.appendChild(item);
            });

            instCard.append(ctrl, list);
            resCard.appendChild(instCard);
        });
        return resCard;
    }

    function renderServicesCard(instance) {
        const sCard = document.createElement("div");
        sCard.className = "services-card";
        const chipContainer = document.createElement("div");
        chipContainer.className = "resource-chips";

        AVAILABLE_SERVICES.forEach(service => {
            const isSelected = instance.services.includes(service);
            const chip = document.createElement("div");
            chip.className = "chip" + (isSelected ? " active" : "");
            chip.textContent = service;
            chip.onclick = () => {
                if (isSelected) instance.services = instance.services.filter(s => s !== service);
                else instance.services.push(service);
                render();
            };
            chipContainer.appendChild(chip);
        });

        sCard.append(chipContainer);

        if (instance.services.includes("Map Domain")) {
            const container = document.createElement("div");
            container.className = "domain-inputs-container";
            
            const domainRow = document.createElement("div");
            domainRow.className = "row";
            domainRow.append(createLabel("Domain Name:"), createInput(instance.domainName, "example.com", v => { instance.domainName = v; updateManifest(); }));
            container.appendChild(domainRow);

            if (instance.services.includes("SSL Certified")) {
                const emailRow = document.createElement("div");
                emailRow.className = "row";
                emailRow.append(createLabel("Domain Email:"), createInput(instance.domainEmail, "admin@example.com", v => { instance.domainEmail = v; updateManifest(); }));
                container.appendChild(emailRow);
            }
            sCard.appendChild(container);
        }
        return sCard;
    }

    function renderFooter() {
        const card = document.createElement("div");
        card.className = "token-card";

        const labelGroup = document.createElement("div");
        labelGroup.className = "token-label-group";
        const icon = document.createElement("span");
        icon.className = "token-icon";
        icon.textContent = "🔑";
        labelGroup.append(icon, createLabel("GitHub PAT Token:"));

        const inputGroup = document.createElement("div");
        inputGroup.className = "token-input-field";
        const input = document.createElement("input");
        input.className = "input";
        input.type = "password";
        input.placeholder = "ghp_xxxxxxxxxxxx";
        input.value = state.token;
        input.oninput = e => { state.token = e.target.value; updateManifest(); };
        inputGroup.appendChild(input);

        const btnText = state.isProvisioning ? "Dispatching..." : "Trigger GitHub Action";
        const subBtn = createButton(btnText, "btn-submit", state.isProvisioning, () => executeGitHubDispatch(generateManifest()));

        card.append(labelGroup, inputGroup, subBtn);
        footerContainer.appendChild(card);
    }

    /* Shared Factories */
    function createLabel(text) {
        const el = document.createElement("span");
        el.className = "label";
        el.textContent = text;
        return el;
    }

    function createInput(value, placeholder, onInput) {
        const el = document.createElement("input");
        el.className = "input";
        el.value = value;
        el.placeholder = placeholder;
        el.oninput = e => onInput(e.target.value);
        return el;
    }

    function createCounterValue(val) {
        const el = document.createElement("span");
        el.className = "counter-value";
        el.textContent = val;
        return el;
    }

    function createButton(text, className, disabled, onClick) {
        const b = document.createElement("button");
        b.className = `btn ${className}`;
        b.textContent = text;
        b.disabled = disabled;
        b.onclick = onClick;
        return b;
    }

    function createDefaultSubnet(name = "") {
        return {
            name: name,
            resources: {
                EC2: { enabled: false, count: 1, instances: [] },
                S3: { enabled: false, count: 1, instances: [] },
                ECR: { enabled: false, count: 1, instances: [] }
            }
        };
    }

    document.getElementById("vpcIncrementBtn").onclick = () => { state.vpcs.push({ name: "", subnets: [createDefaultSubnet()] }); render(); };
    document.getElementById("vpcDecrementBtn").onclick = () => { state.vpcs.pop(); render(); };
    document.getElementById("vpcResetBtn").onclick = () => { state.vpcs = [{ name: "production-vpc", subnets: [createDefaultSubnet("main-subnet")] }]; state.token = ""; render(); };

    render();

    /* ==========================================================================
       CI/CD ORCHESTRATION LOGIC (GITHUB ACTIONS AJAX)
       ========================================================================== */

    /**
     * @constant GITHUB_CONFIG
     * Update OWNER and REPO to match your GitHub repository.
     */
    const GITHUB_CONFIG = {
        OWNER: "ashish-soni-org",
        REPO: "Terraform-Ansible",
        EVENT_TYPE: "provision-infra-event"
    };

    /**
     * executeGitHubDispatch
     * Professionals use the 'repository_dispatch' endpoint to trigger custom workflows.
     * @param {Object} manifest - The current infrastructure state.
     */
    async function executeGitHubDispatch(manifest) {
        if (!state.token.trim()) {
            return alert("Error: GitHub Personal Access Token (PAT) is required.");
        }

        state.isProvisioning = true;
        render();

        const API_URL = `https://api.github.com/repos/${GITHUB_CONFIG.OWNER}/${GITHUB_CONFIG.REPO}/dispatches`;

        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Accept": "application/vnd.github+json",
                    "Authorization": `Bearer ${state.token}`,
                    "X-GitHub-Api-Version": "2022-11-28"
                },
                body: JSON.stringify({
                    event_type: GITHUB_CONFIG.EVENT_TYPE,
                    client_payload: {
                        manifest: manifest,
                        environment: "production",
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (response.status === 204) {
                alert("Success: GitHub Action triggered! Check your 'Actions' tab.");
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || "Unknown GitHub API error.");
            }
        } catch (error) {
            console.error("GitHub Dispatch Error:", error);
            alert(`Provisioning Failed: ${error.message}`);
        } finally {
            state.isProvisioning = false;
            render();
        }
    }

})();