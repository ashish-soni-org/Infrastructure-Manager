"use strict";

(function () {
    const MIN = 1;
    const MAX = 5;
    const THEME_KEY = "provision_theme_v3";
    const AVAILABLE_COMPUTE_SERVICES = ["Self-Hosted-Runner", "NGINX", "Docker", "MiniKube", "Map Domain", "SSL Certified"];

    // Default State Initialization
    const state = {
        vpcs: [{
            name: "production-vpc",
            subnets: [createDefaultSubnet("main-subnet")]
        }],
        // Standalone services moved out of VPC/Subnet structure
        standalone: {
            S3: { enabled: false, count: 1, instances: [] },
            ECR: { enabled: false, count: 1, instances: [] }
        },
        token: "",
        isProvisioning: false,
        isDestroying: false
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

    /* Data Logic */

    function createDefaultSubnet(name = "") {
        return {
            name: name,
            resources: {
                EC2: { enabled: false, count: 1, instances: [] }
                // S3 and ECR removed from subnet level
            }
        };
    }

    function generateManifest() {
        return {
            vpcs: state.vpcs.map(vpc => ({
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
            })),
            standalone: Object.entries(state.standalone)
                .filter(([_, r]) => r.enabled)
                .map(([type, r]) => ({
                    type,
                    count: r.count,
                    instances: r.instances.map(inst => ({
                        name: inst.name
                        // Standalone services (S3/ECR) generally don't have "Compute Services" like Nginx/Docker
                    }))
                }))
        };
    }

    /* Rendering Logic */

    const manifestViewer = document.getElementById("manifestViewer");
    const copyBtn = document.getElementById("copyManifestBtn");
    const vpcContainer = document.getElementById("vpcContainer");
    const standaloneContainer = document.getElementById("standaloneContainer");
    const footerContainer = document.getElementById("footerContainer");
    const vpcCounterValue = document.getElementById("vpcCounterValue");

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

    function render() {
        vpcContainer.innerHTML = "";
        standaloneContainer.innerHTML = "";
        footerContainer.innerHTML = "";

        // 1. Render VPCs
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
                snCard.append(snRow, renderSubnetResources(subnet));
                vpcCard.appendChild(snCard);
            });

            vpcContainer.appendChild(vpcCard);
        });

        // 2. Render Standalone Services
        renderStandaloneServices();

        // 3. Render Footer
        renderFooter();
        updateManifest();
    }

    function renderSubnetResources(subnet) {
        // Handles EC2 inside Subnets
        const resCard = document.createElement("div");
        resCard.className = "resources-card";

        const chips = document.createElement("div");
        chips.className = "resource-chips";
        
        // Only EC2 exists in subnet now
        ["EC2"].forEach(type => {
            const chip = document.createElement("div");
            chip.className = "chip" + (subnet.resources[type].enabled ? " active" : "");
            chip.textContent = `Enable ${type}`;
            chip.onclick = () => { subnet.resources[type].enabled = !subnet.resources[type].enabled; render(); };
            chips.appendChild(chip);
        });

        resCard.append(chips);

        Object.entries(subnet.resources).forEach(([type, data]) => {
            if (!data.enabled) return;
            ensureInstanceCount(data);

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
                // Compute services only for EC2
                if (type === "EC2") item.appendChild(renderServicesCard(inst));
                list.appendChild(item);
            });

            instCard.append(ctrl, list);
            resCard.appendChild(instCard);
        });
        return resCard;
    }

    function renderStandaloneServices() {
        const wrapper = document.createElement("div");
        
        // Chip selector for Standalone
        const selectorCard = document.createElement("div");
        selectorCard.className = "standalone-card";
        const selectorRow = document.createElement("div");
        selectorRow.className = "row";
        selectorRow.style.justifyContent = "center";
        
        Object.keys(state.standalone).forEach(type => {
            const chip = document.createElement("div");
            chip.className = "chip" + (state.standalone[type].enabled ? " active" : "");
            chip.textContent = `Enable ${type}`;
            chip.onclick = () => { state.standalone[type].enabled = !state.standalone[type].enabled; render(); };
            selectorRow.appendChild(chip);
        });
        selectorCard.appendChild(selectorRow);
        wrapper.appendChild(selectorCard);

        // Render Cards for enabled services
        Object.entries(state.standalone).forEach(([type, data]) => {
            if (!data.enabled) return;
            ensureInstanceCount(data);

            const sCard = document.createElement("div");
            sCard.className = "standalone-card";
            
            const ctrl = document.createElement("div");
            ctrl.className = "row";
            ctrl.append(
                createLabel(`${type} Resources:`),
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
                row.append(createLabel(`${idx + 1}. Name:`), createInput(inst.name, `${type}_Bucket_Or_Repo_${idx + 1}`, v => { inst.name = v; updateManifest(); }));
                item.append(row);
                list.appendChild(item);
            });

            sCard.append(ctrl, list);
            wrapper.appendChild(sCard);
        });

        standaloneContainer.appendChild(wrapper);
    }

    function ensureInstanceCount(data) {
        while (data.instances.length < data.count) {
            data.instances.push({ name: "", services: [], domainName: "", domainEmail: "" });
        }
        data.instances.length = data.count;
    }

    function renderServicesCard(instance) {
        const sCard = document.createElement("div");
        sCard.className = "services-card";
        const chipContainer = document.createElement("div");
        chipContainer.className = "resource-chips";

        AVAILABLE_COMPUTE_SERVICES.forEach(service => {
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
        labelGroup.append(icon, createLabel("PAT Token:"));

        const inputGroup = document.createElement("div");
        inputGroup.className = "token-input-field";
        const input = document.createElement("input");
        input.className = "input";
        input.type = "password";
        input.placeholder = "Enter GitHub PAT";
        input.value = state.token;
        input.oninput = e => { state.token = e.target.value; updateManifest(); };
        inputGroup.appendChild(input);

        // Provision Button
        const provBtnText = state.isProvisioning ? "Provisioning..." : "Provision";
        const provBtn = createButton(provBtnText, "btn-submit", state.isProvisioning || state.isDestroying, () => executeGitHubDispatch(generateManifest(), "apply"));

        // Destroy Button
        const destBtnText = state.isDestroying ? "Destroying..." : "Destroy All";
        const destBtn = createButton(destBtnText, "btn-destroy", state.isProvisioning || state.isDestroying, () => {
            if(confirm("CRITICAL: This will destroy all resources in this state. Continue?")) {
                executeGitHubDispatch(generateManifest(), "destroy");
            }
        });

        card.append(labelGroup, inputGroup, destBtn, provBtn);
        footerContainer.appendChild(card);
    }

    /* Helper Functions */

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

    /* Event Listeners & Init */

    document.getElementById("vpcIncrementBtn").onclick = () => { state.vpcs.push({ name: "", subnets: [createDefaultSubnet()] }); render(); };
    document.getElementById("vpcDecrementBtn").onclick = () => { state.vpcs.pop(); render(); };
    document.getElementById("globalResetBtn").onclick = () => { 
        state.vpcs = [{ name: "production-vpc", subnets: [createDefaultSubnet("main-subnet")] }]; 
        state.standalone.S3.enabled = false;
        state.standalone.S3.count = 1;
        state.standalone.ECR.enabled = false;
        state.standalone.ECR.count = 1;
        state.token = ""; 
        render(); 
    };

    render();

    /* ==========================================================================
       CI/CD ORCHESTRATION LOGIC
       ========================================================================== */

    const GITHUB_CONFIG = {
        OWNER: "ashish-soni-org", 
        REPO: "Terraform-Ansible",
        EVENT_TYPE_APPLY: "event-provision-infra",
        EVENT_TYPE_DESTROY: "event-destroy-infra"
    };

    async function executeGitHubDispatch(manifest, action) {
        if (!state.token.trim()) return alert("Error: GitHub PAT is required.");

        const eventType = action === "destroy" 
            ? GITHUB_CONFIG.EVENT_TYPE_DESTROY 
            : GITHUB_CONFIG.EVENT_TYPE_APPLY;

        if (action === "apply") state.isProvisioning = true;
        else state.isDestroying = true;
        
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
                    event_type: eventType,
                    client_payload: {
                        manifest: manifest,
                        tf_action: action, 
                        timestamp: new Date().toISOString()
                    }
                })
            });

            if (response.status === 204) {
                alert(`Success: ${action === "destroy" ? "Destroy" : "Provision"} event triggered!`);
            } else {
                throw new Error("GitHub API error.");
            }
        } catch (error) {
            alert(`Failed: ${error.message}`);
        } finally {
            state.isProvisioning = false;
            state.isDestroying = false;
            render();
        }
    }

})();