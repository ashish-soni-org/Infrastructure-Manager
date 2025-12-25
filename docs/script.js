"use strict";

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

    function generateManifest() {
        // Build VPC part
        const manifest = state.vpcs.map(vpc => ({
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

        // Append Standalone Resources to a "Global" or first VPC context for TF compatibility
        const standaloneResources = Object.entries(state.standalone)
            .filter(([_, r]) => r.enabled)
            .map(([type, r]) => ({
                type,
                count: r.count,
                instances: r.instances.map(inst => ({ name: inst.name, services: [] }))
            }));

        if (standaloneResources.length > 0) {
            // We inject these into a special "Global-VPC" or append to existing
            manifest.push({
                vpc_name: "Global-Infrastructure",
                subnets: [{
                    subnet_name: "Regional-Scope",
                    resources: standaloneResources
                }]
            });
        }

        return manifest;
    }

    const manifestViewer = document.getElementById("manifestViewer");
    const copyBtn = document.getElementById("copyManifestBtn");

    function updateManifest() {
        manifestViewer.textContent = JSON.stringify(generateManifest(), null, 4);
    }

    copyBtn.onclick = () => {
        navigator.clipboard.writeText(manifestViewer.textContent);
        const original = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => copyBtn.textContent = original, 2000);
    };

    const vpcContainer = document.getElementById("vpcContainer");
    const footerContainer = document.getElementById("footerContainer");
    const vpcCounterValue = document.getElementById("vpcCounterValue");

    function render() {
        vpcContainer.innerHTML = "";
        footerContainer.innerHTML = "";

        vpcCounterValue.textContent = state.vpcs.length;
        document.getElementById("vpcDecrementBtn").disabled = state.vpcs.length <= MIN;
        document.getElementById("vpcIncrementBtn").disabled = state.vpcs.length >= MAX;

        // 1. Render Standalone Services Card first
        renderStandaloneCard();

        // 2. Render VPC Cards
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

    function renderStandaloneCard() {
        const card = document.createElement("div");
        card.className = "vpc-card";
        card.style.borderStyle = "solid";
        card.style.borderColor = "var(--accent)";

        const title = document.createElement("div");
        title.className = "row";
        title.innerHTML = `<span class="label" style="color:var(--accent)">🌐 Standalone Regional Services (S3, ECR)</span>`;
        
        const chips = document.createElement("div");
        chips.className = "resource-chips";
        ["S3", "ECR"].forEach(type => {
            const chip = document.createElement("div");
            chip.className = "chip" + (state.standalone[type].enabled ? " active" : "");
            chip.textContent = type;
            chip.onclick = () => { state.standalone[type].enabled = !state.standalone[type].enabled; render(); };
            chips.appendChild(chip);
        });

        card.append(title, chips);

        Object.entries(state.standalone).forEach(([type, data]) => {
            if (!data.enabled) return;
            ensureInstances(data);
            card.appendChild(createInstanceList(type, data));
        });

        vpcContainer.appendChild(card);
    }

    function renderResources(subnet) {
        const resCard = document.createElement("div");
        resCard.className = "resources-card";

        const chips = document.createElement("div");
        chips.className = "resource-chips";
        // Only EC2 is left here
        ["EC2"].forEach(type => {
            const chip = document.createElement("div");
            chip.className = "chip" + (subnet.resources[type].enabled ? " active" : "");
            chip.textContent = type;
            chip.onclick = () => { subnet.resources[type].enabled = !subnet.resources[type].enabled; render(); };
            chips.appendChild(chip);
        });

        resCard.append(chips);

        Object.entries(subnet.resources).forEach(([type, data]) => {
            if (!data.enabled) return;
            ensureInstances(data);
            resCard.appendChild(createInstanceList(type, data, true));
        });
        return resCard;
    }

    function ensureInstances(data) {
        while (data.instances.length < data.count) {
            data.instances.push({ name: "", services: [], domainName: "", domainEmail: "" });
        }
        data.instances.length = data.count;
    }

    function createInstanceList(type, data, isEC2 = false) {
        const instCard = document.createElement("div");
        instCard.className = "resource-instance-card";
        const ctrl = document.createElement("div");
        ctrl.className = "row";
        ctrl.append(
            createLabel(`${type} Units:`),
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
            row.append(createLabel(`${idx + 1}. Name:`), createInput(inst.name, `${type}_Name`, v => { inst.name = v; updateManifest(); }));
            item.append(row);
            if (type === "EC2") item.appendChild(renderServicesCard(inst));
            list.appendChild(item);
        });

        instCard.append(ctrl, list);
        return instCard;
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
            container.append(
                createRow(createLabel("Domain:"), createInput(instance.domainName, "example.com", v => { instance.domainName = v; updateManifest(); }))
            );

            if (instance.services.includes("SSL Certified")) {
                container.append(
                    createRow(createLabel("Email:"), createInput(instance.domainEmail, "admin@ex.com", v => { instance.domainEmail = v; updateManifest(); }))
                );
            }
            sCard.appendChild(container);
        }
        return sCard;
    }

    function renderFooter() {
        const card = document.createElement("div");
        card.className = "token-card";
        const inputGroup = document.createElement("div");
        inputGroup.className = "token-input-field";
        const input = document.createElement("input");
        input.className = "input";
        input.type = "password";
        input.placeholder = "GitHub PAT";
        input.value = state.token;
        input.oninput = e => { state.token = e.target.value; updateManifest(); };
        inputGroup.appendChild(input);

        const provBtn = createButton(state.isProvisioning ? "..." : "Provision", "btn-submit", state.isProvisioning, () => executeGitHubDispatch(generateManifest(), "apply"));
        const destBtn = createButton(state.isDestroying ? "..." : "Destroy", "btn-destroy", state.isDestroying, () => confirm("Destroy all?") && executeGitHubDispatch(generateManifest(), "destroy"));

        card.append(createLabel("🔑 PAT:"), inputGroup, destBtn, provBtn);
        footerContainer.appendChild(card);
    }

    /* Helpers */
    function createRow(...els) { const r = document.createElement("div"); r.className = "row"; r.append(...els); return r; }
    function createLabel(text) { const el = document.createElement("span"); el.className = "label"; el.textContent = text; return el; }
    function createInput(value, placeholder, onInput) { const el = document.createElement("input"); el.className = "input"; el.value = value; el.placeholder = placeholder; el.oninput = e => onInput(e.target.value); return el; }
    function createCounterValue(val) { const el = document.createElement("span"); el.className = "counter-value"; el.textContent = val; return el; }
    function createButton(text, className, disabled, onClick) { const b = document.createElement("button"); b.className = `btn ${className}`; b.textContent = text; b.disabled = disabled; b.onclick = onClick; return b; }
    function createDefaultSubnet(name = "") { return { name: name, resources: { EC2: { enabled: false, count: 1, instances: [] } } }; }

    document.getElementById("vpcIncrementBtn").onclick = () => { state.vpcs.push({ name: "", subnets: [createDefaultSubnet()] }); render(); };
    document.getElementById("vpcDecrementBtn").onclick = () => { state.vpcs.pop(); render(); };
    document.getElementById("vpcResetBtn").onclick = () => { state.vpcs = [{ name: "production-vpc", subnets: [createDefaultSubnet("main-subnet")] }]; state.standalone.S3.enabled=false; state.standalone.ECR.enabled=false; state.token = ""; render(); };

    render();

    /* CI/CD */
    async function executeGitHubDispatch(manifest, action) {
        if (!state.token.trim()) return alert("Token Required");
        action === "apply" ? state.isProvisioning = true : state.isDestroying = true;
        render();
        try {
            const res = await fetch(`https://api.github.com/repos/ashish-soni-org/Terraform-Ansible/dispatches`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${state.token}`, "Accept": "application/vnd.github+json" },
                body: JSON.stringify({ event_type: action === "destroy" ? "event-destroy-infra" : "event-provision-infra", client_payload: { manifest } })
            });
            if (res.status === 204) alert("Triggered!");
        } catch (e) { alert("Error"); }
        state.isProvisioning = false; state.isDestroying = false; render();
    }
})();