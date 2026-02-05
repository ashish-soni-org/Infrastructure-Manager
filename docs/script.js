// Global Data State
let appData = {
    compute: [],
    global: { s3: [], ecr: [] },
    deploy: { options: [], active: '' },
    repositories: [],
    instances: []
};

// Legacy mappings for backward compatibility during refactor
let vpcData = {};
let subnetData = {};

// Fetch and load resources from JSON
async function loadResources() {
    try {
        const response = await fetch('aws_resources.json?t=' + Date.now());
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        // Basic structural check
        if (data.compute && Array.isArray(data.compute)) {
            appData = data;
        } else if (Array.isArray(data)) {
            // Backward compatibility for old flat array format
            appData.compute = data;
        }

        // Re-populate legacy mappings for functions that still use them
        vpcData = {};
        subnetData = {};
        appData.compute.forEach(vpc => {
            vpcData[vpc.name] = vpc.subnets.map(s => s.name);
            vpc.subnets.forEach(subnet => {
                subnetData[subnet.name] = subnet.ec2s.map(e => e.name);
            });
        });

        // Initialize Global Counters from appData
        initGlobalCounters();

        // Initial UI Renders
        renderVPCs();
        updateSubnets(null);
        updateEC2s(null);
        renderDeployMethods();
        renderAvailableRepos();
        renderInstances();
        renderManifestTree();

    } catch (e) {
        console.error("Could not load resources:", e);
        renderVPCs();
    }
}

function initGlobalCounters() {
    const s3Counter = document.getElementById('s3-counter');
    const ecrCounter = document.getElementById('ecr-counter');
    const s3Chips = document.getElementById('s3-chips');
    const ecrChips = document.getElementById('ecr-chips');

    if (s3Counter && s3Chips) {
        s3Counter.innerHTML = '';
        s3Chips.innerHTML = '';
        createCounter('s3-counter', 's3-chips', 'S3 Bucket', true, appData.global?.s3 || []);
    }
    if (ecrCounter && ecrChips) {
        ecrCounter.innerHTML = '';
        ecrChips.innerHTML = '';
        createCounter('ecr-counter', 'ecr-chips', 'ECR Repository', false, appData.global?.ecr || []);
    }
}

function renderDeployMethods() {
    const container = document.getElementById('deploy-methods-container');
    if (!container || !appData.deploy) return;

    container.innerHTML = '';
    appData.deploy.options.forEach(opt => {
        const isActive = opt.id === appData.deploy.active;
        const div = document.createElement('div');
        div.id = `deploy-${opt.id}`;
        div.className = `deploy-option ${isActive ? 'active' : ''}`;
        div.onclick = () => selectDeployMethod(opt.id);

        div.innerHTML = `
            <div class="option-icon">${opt.id === 'classic' ? '🌐' : '☸️'}</div>
            <div class="option-content">
                <div class="option-title">${opt.title}</div>
                <div class="option-desc">${opt.description}</div>
            </div>
        `;
        container.appendChild(div);
    });
}

function renderVPCs() {
    const vpcContainer = document.getElementById('vpc-chips');
    if (!vpcContainer) return;

    vpcContainer.innerHTML = ''; // Clear existing (including placeholders if any)

    Object.keys(vpcData).forEach(vpcName => {
        const chip = document.createElement('div');
        chip.className = 'glass-chip';
        chip.textContent = vpcName;
        chip.onclick = function () { selectChip(this); };
        vpcContainer.appendChild(chip);
    });

    // Add New VPC chip
    const newChip = document.createElement('div');
    newChip.className = 'glass-chip new-vpc-chip';
    newChip.innerHTML = '<span class="plus-icon">+</span> New VPC';
    newChip.onclick = function () { selectChip(this); };
    vpcContainer.appendChild(newChip);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', loadResources);


function selectChip(selectedChip) {
    // Get the parent container
    const container = selectedChip.parentElement;

    // Remove active class from all chips in this container
    const chips = container.getElementsByClassName('glass-chip');
    for (let chip of chips) {
        chip.classList.remove('active');
    }

    // Add active class to the selected chip
    selectedChip.classList.add('active');

    // Logic for cascading updates
    const value = selectedChip.textContent.trim();

    // Clear any open "New Resource" inputs in this group
    const resourceGroup = container.closest('.resource-group');
    const existingInput = resourceGroup.querySelector('.new-resource-input-container');
    if (existingInput) {
        existingInput.remove();
    }


    // Check if it's a "New ..." chip - Logic to open input kept, cascading updates removed
    if (selectedChip.classList.contains('new-vpc-chip')) {
        handleNewResourceInput(selectedChip, container.id);
        return;
    }

}

function handleNewResourceInput(chipElement, containerId) {
    const chipContainer = chipElement.parentElement;
    const resourceGroup = chipContainer.parentElement;

    // Data persistence logic: Check if parent is selected for Subnet/EC2
    // Data persistence logic: Check if parent is selected for Subnet/EC2 - REMOVED



    // Check if input already exists
    if (resourceGroup.querySelector('.new-resource-input-container')) {
        resourceGroup.querySelector('input').focus();
        return;
    }

    // Determine resource type name for placeholder
    let resourceTypeName = 'Resource';
    let exampleName = 'My-Resource';

    if (containerId === 'vpc-chips') {
        resourceTypeName = 'VPC';
        exampleName = 'Prod-VPC-01';
    } else if (containerId === 'subnet-chips') {
        resourceTypeName = 'Subnet';
        exampleName = 'Public-Subnet-A';
    } else if (containerId === 'ec2-chips') {
        resourceTypeName = 'EC2';
        exampleName = 'Web-Server-01';
    }

    // Create container for input
    const inputContainer = document.createElement('div');
    inputContainer.className = 'new-resource-input-container';

    // Create input element
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'glass-input';
    input.placeholder = `${resourceTypeName} Name`;
    input.setAttribute('aria-label', `${resourceTypeName} Name`);

    // Create Help Icon
    const helpIcon = document.createElement('span');
    helpIcon.className = 'help-icon';
    helpIcon.textContent = '?';



    // Create Tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'glass-tooltip';
    tooltip.innerHTML = `
        <strong>${resourceTypeName} Requirements:</strong><br>
        • Case-sensitive<br>
        • Max 256 characters<br>
        • Allowed: a-z, A-Z, 0-9, spaces<br>
        • Special: . : / = + - @ _<br>
        <em style="display:block;margin-top:0.5rem;color:rgba(255,255,255,0.6)">Ex: ${exampleName}</em>
    `;

    // Validation Logic
    const isValidName = (name) => {
        if (!name || name.length > 256) return false;
        // AWS Regex allowed chars: a-z, A-Z, 0-9, spaces, . : / = + - @ _
        // We need to escape special regex chars: - / . +
        const regex = /^[a-zA-Z0-9\s.:\/=+\-@_]+$/;
        return regex.test(name);
    };

    const updateValidation = () => {
        // Validation logic kept for potential future use or visual feedback on input border if needed
        // but removing the icon update logic
    };

    // Attach listeners
    input.oninput = updateValidation;



    // Create sub-container for styling wrapper
    const subContainer = document.createElement('div');
    if (containerId === 'vpc-chips' || containerId === 'subnet-chips' || containerId === 'ec2-chips') {
        subContainer.className = 'active-blue-container';
    }

    const nameRow = document.createElement('div');
    nameRow.className = 'input-row';
    nameRow.style.display = 'flex';
    nameRow.style.alignItems = 'center';
    nameRow.style.position = 'relative'; // For tooltip

    nameRow.appendChild(input);
    nameRow.appendChild(helpIcon);
    nameRow.appendChild(tooltip);
    subContainer.appendChild(nameRow);

    // VPC Specific: Add CIDR Row
    if (containerId === 'vpc-chips') {
        const cidrContainer = document.createElement('div');
        cidrContainer.className = 'cidr-container';

        // Label
        const label = document.createElement('span');
        label.className = 'cidr-label';
        label.textContent = 'CIDR:';
        cidrContainer.appendChild(label);

        // Group 1: Random / Custom
        const modeGroup = document.createElement('div');
        modeGroup.className = 'cidr-radio-group';

        const createRadio = (name, value, labelText, checked = false) => {
            const wrapper = document.createElement('label');
            wrapper.className = 'radio-wrapper';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = name;
            radio.value = value;
            if (checked) radio.checked = true;
            wrapper.appendChild(radio);
            wrapper.appendChild(document.createTextNode(` ${labelText}`));
            return wrapper;
        };

        modeGroup.appendChild(createRadio('cidr-mode', 'random', 'Random', true));
        modeGroup.appendChild(createRadio('cidr-mode', 'custom', 'Custom'));
        cidrContainer.appendChild(modeGroup);

        // Group 2: Bits
        const bitGroup = document.createElement('div');
        bitGroup.className = 'cidr-radio-group';
        bitGroup.appendChild(createRadio('cidr-bits', '8', '8 bit'));
        bitGroup.appendChild(createRadio('cidr-bits', '16', '16 bit', true)); // Default
        bitGroup.appendChild(createRadio('cidr-bits', '24', '24 bit'));
        cidrContainer.appendChild(bitGroup);

        // CIDR Text Input
        const cidrInput = document.createElement('input');
        cidrInput.type = 'text';
        cidrInput.className = 'glass-input cidr-input';
        cidrInput.placeholder = '10.0.0.0/16';
        cidrInput.readOnly = true; // Default to Random
        cidrContainer.appendChild(cidrInput);

        subContainer.appendChild(cidrContainer);

        // VPC Specific: Add Route Table Row
        const rtContainer = document.createElement('div');
        rtContainer.className = 'cidr-container';

        const rtLabel = document.createElement('span');
        rtLabel.className = 'cidr-label';
        rtLabel.textContent = 'Route Table:';
        rtContainer.appendChild(rtLabel);

        const rtGroup = document.createElement('div');
        rtGroup.className = 'cidr-radio-group';
        rtGroup.style.borderRight = 'none';

        rtGroup.appendChild(createRadio('rt-mode', 'main', 'Main', true));
        rtGroup.appendChild(createRadio('rt-mode', 'custom', 'Custom'));

        rtContainer.appendChild(rtGroup);
        subContainer.appendChild(rtContainer);

        // VPC Specific: Add Internet Gateway Row
        const igwContainer = document.createElement('div');
        igwContainer.className = 'cidr-container'; // Reusing style for consistency

        const igwLabel = document.createElement('span');
        igwLabel.className = 'cidr-label';
        igwLabel.textContent = 'Internet Gateway:';
        igwContainer.appendChild(igwLabel);

        const igwGroup = document.createElement('div');
        igwGroup.className = 'cidr-radio-group';
        // Remove border for the last items
        igwGroup.style.borderRight = 'none';

        igwGroup.appendChild(createRadio('igw-attach', 'yes', 'Yes', true));
        igwGroup.appendChild(createRadio('igw-attach', 'no', 'No'));

        igwContainer.appendChild(igwGroup);
        subContainer.appendChild(igwContainer);

        // Basic Logic wiring
        subContainer.addEventListener('change', (e) => {
            if (e.target.name === 'cidr-mode') {
                const isCustom = e.target.value === 'custom';
                cidrInput.readOnly = !isCustom;
                if (!isCustom) {
                    cidrInput.value = ''; // Reset or keep visible
                    cidrInput.placeholder = '10.0.0.0/16';
                } else {
                    cidrInput.focus();
                }
            }
        });
    }

    // EC2 Specific: Add Storage and Elastic IP Rows
    if (containerId === 'ec2-chips') {
        // Redefine createRadio helper (or use a shared one if I moved it, but duplicating for safety in this scoped edit)
        const createRadio = (name, value, labelText, checked = false) => {
            const wrapper = document.createElement('label');
            wrapper.className = 'radio-wrapper';
            const radio = document.createElement('input');
            radio.type = 'radio';
            radio.name = name;
            radio.value = value;
            if (checked) radio.checked = true;
            wrapper.appendChild(radio);
            wrapper.appendChild(document.createTextNode(` ${labelText}`));
            return wrapper;
        };

        // 1. Storage Row
        const storageContainer = document.createElement('div');
        storageContainer.className = 'cidr-container';

        const storageLabel = document.createElement('span');
        storageLabel.className = 'cidr-label';
        storageLabel.textContent = 'Storage:';
        storageContainer.appendChild(storageLabel);

        const storageGroup = document.createElement('div');
        storageGroup.className = 'cidr-radio-group';
        storageGroup.appendChild(createRadio('ec2-storage', '8gb', '8 GB', true));
        storageGroup.appendChild(createRadio('ec2-storage', '30gb', '30 GB'));
        storageGroup.appendChild(createRadio('ec2-storage', 'custom', 'Custom'));
        storageContainer.appendChild(storageGroup);

        // Custom Storage Input (hidden by default unless Custom selected)
        const storageInput = document.createElement('input');
        storageInput.type = 'text';
        storageInput.className = 'glass-input cidr-input';
        storageInput.placeholder = 'e.g. 100';
        storageInput.style.width = '120px';
        storageInput.style.display = 'none'; // Initially hidden
        storageContainer.appendChild(storageInput);

        subContainer.appendChild(storageContainer);

        // 2. Elastic IP Row
        const eipContainer = document.createElement('div');
        eipContainer.className = 'cidr-container';

        const eipLabel = document.createElement('span');
        eipLabel.className = 'cidr-label';
        eipLabel.textContent = 'Elastic IP:';
        eipContainer.appendChild(eipLabel);

        const eipGroup = document.createElement('div');
        eipGroup.className = 'cidr-radio-group';
        eipGroup.style.borderRight = 'none'; // No border since it's the last group
        eipGroup.appendChild(createRadio('ec2-eip', 'yes', 'Yes'));
        eipGroup.appendChild(createRadio('ec2-eip', 'no', 'No', true)); // Default to No usually, or Yes? User didn't specify. I'll default to No to be safe/cost-effective.
        eipContainer.appendChild(eipGroup);

        subContainer.appendChild(eipContainer);

        // 3. Configure EC2 & Install Tools Split Row
        const splitRow = document.createElement('div');
        splitRow.className = 'split-row';

        // Section 1: Configure EC2
        const configSection = document.createElement('div');
        configSection.className = 'split-section';
        const configTitle = document.createElement('h4');
        configTitle.className = 'section-title';
        configTitle.textContent = 'Configure EC2';
        configSection.appendChild(configTitle);

        // Helper to create toggleable action chips
        const createActionChip = (text, onClick) => {
            const chip = document.createElement('div');
            chip.className = 'action-chip';
            chip.textContent = text;
            chip.onclick = () => {
                const wasSelected = chip.classList.contains('selected');
                chip.classList.toggle('selected');
                if (onClick) onClick(!wasSelected);
            };
            return chip;
        };

        // 1. Runner (Standard)
        const runnerWrapper = document.createElement('div');
        runnerWrapper.style.display = 'flex';
        runnerWrapper.style.justifyContent = 'center';
        runnerWrapper.appendChild(createActionChip('Attach Self-Hosted-Runner'));
        configSection.appendChild(runnerWrapper);

        // 2. Swap Memory (Input on right)
        const swapWrapper = document.createElement('div');
        swapWrapper.style.display = 'flex';
        swapWrapper.style.alignItems = 'center';
        swapWrapper.style.gap = '1rem';
        swapWrapper.style.justifyContent = 'center';

        const swapInput = document.createElement('input');
        swapInput.type = 'text';
        swapInput.className = 'glass-input';
        swapInput.placeholder = 'Size (GB)';
        swapInput.style.width = '120px';
        swapInput.style.display = 'none';
        swapInput.style.marginTop = '0'; // Override defaults

        const swapChip = createActionChip('Swap Memory', (isSelected) => {
            swapInput.style.display = isSelected ? 'block' : 'none';
            if (isSelected) swapInput.focus();
        });

        swapWrapper.appendChild(swapChip);
        swapWrapper.appendChild(swapInput);
        configSection.appendChild(swapWrapper);

        // 3. Map Domain (Inputs below)
        const domainWrapper = document.createElement('div');
        domainWrapper.style.display = 'flex';
        domainWrapper.style.flexDirection = 'column';
        domainWrapper.style.alignItems = 'center';
        domainWrapper.style.gap = '0.5rem';
        domainWrapper.style.width = '100%';

        const domainInputs = document.createElement('div');
        domainInputs.style.display = 'none';
        domainInputs.style.flexDirection = 'column';
        domainInputs.style.gap = '0.5rem';
        domainInputs.style.width = '100%';
        domainInputs.style.alignItems = 'center';

        const domainNameInput = document.createElement('input');
        domainNameInput.type = 'text';
        domainNameInput.className = 'glass-input';
        domainNameInput.placeholder = 'Domain Name';
        domainNameInput.style.width = '90%';

        const domainEmailInput = document.createElement('input');
        domainEmailInput.type = 'text';
        domainEmailInput.className = 'glass-input';
        domainEmailInput.placeholder = 'Domain Email';
        domainEmailInput.style.width = '90%';

        domainInputs.appendChild(domainNameInput);
        domainInputs.appendChild(domainEmailInput);

        const domainChip = createActionChip('Map Domain & SSL Certify', (isSelected) => {
            domainInputs.style.display = isSelected ? 'flex' : 'none';
            if (isSelected) domainNameInput.focus();
        });

        domainWrapper.appendChild(domainChip);
        domainWrapper.appendChild(domainInputs);
        configSection.appendChild(domainWrapper);

        splitRow.appendChild(configSection);

        // Section 2: Install available tools
        const toolsSection = document.createElement('div');
        toolsSection.className = 'split-section';
        const toolsTitle = document.createElement('h4');
        toolsTitle.className = 'section-title';
        toolsTitle.textContent = 'Install available tools';
        toolsSection.appendChild(toolsTitle);

        toolsSection.appendChild(createActionChip('Docker'));

        splitRow.appendChild(toolsSection);

        subContainer.appendChild(splitRow);

        // Logic for Storage Input visibility
        storageGroup.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                storageInput.style.display = 'block';
                storageInput.focus();
            } else {
                storageInput.style.display = 'none';
            }
        });
    }

    inputContainer.appendChild(subContainer);
    resourceGroup.appendChild(inputContainer);
    input.focus();

    // Handle Enter key or Blur (logic to save or cancel)
    const finishCreation = (save) => {
        const newName = input.value.trim();
        // Only proceed if saving AND name is valid
        if (save && isValidName(newName)) {
            // Create the new chip
            const newChip = document.createElement('div');
            newChip.className = 'glass-chip';
            newChip.textContent = newName;
            newChip.onclick = function () { selectChip(this); };

            // Insert before the "New..." chip which is the last child of chipContainer
            const newButton = chipContainer.lastElementChild;
            chipContainer.insertBefore(newChip, newButton);

            // Update data models based on what we are adding
            if (containerId === 'vpc-chips') {
                vpcData[newName] = []; // Initialize empty subnets
                selectChip(newChip);
            } else if (containerId === 'subnet-chips') {
                subnetData[newName] = [];
                // Update parent VPC's subnet list
                const activeVpc = document.querySelector('#vpc-chips .active');
                if (activeVpc) {
                    const vpcName = activeVpc.textContent.trim();
                    if (vpcData[vpcName]) vpcData[vpcName].push(newName);
                }
                selectChip(newChip);
            } else if (containerId === 'ec2-chips') {
                // Update parent Subnet's ec2 list
                const activeSubnet = document.querySelector('#subnet-chips .active');
                if (activeSubnet) {
                    const subnetName = activeSubnet.textContent.trim();
                    if (!subnetData[subnetName]) subnetData[subnetName] = [];
                    subnetData[subnetName].push(newName);
                }
                selectChip(newChip);
            }

            renderManifestTree();


            // Remove the input container ONLY on success
            if (inputContainer.parentElement) {
                inputContainer.parentElement.removeChild(inputContainer);
            }
        } else if (!save) {
            // If specifically cancelling (Escape), remove container
            if (inputContainer.parentElement) {
                inputContainer.parentElement.removeChild(inputContainer);
            }
        }
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            // Validate before submitting
            if (isValidName(input.value)) {
                finishCreation(true);
            }
        } else if (e.key === 'Escape') {
            finishCreation(false);
        }
    };
}

function updateSubnets(vpcName) {
    const subnetContainer = document.getElementById('subnet-chips');

    // Clear any existing input in the subnet section
    clearInput('subnet-chips');

    let subnets = [];
    if (!vpcName) {
        // Show ALL subnets if no VPC selected
        subnets = Object.keys(subnetData);
    } else {
        subnets = vpcData[vpcName] || [];
    }

    subnetContainer.innerHTML = '';

    subnets.forEach(subnet => {
        const chip = document.createElement('div');
        chip.className = 'glass-chip';
        chip.textContent = subnet;
        chip.onclick = function () { selectChip(this); };
        subnetContainer.appendChild(chip);
    });

    const newChip = document.createElement('div');
    newChip.className = 'glass-chip new-vpc-chip';
    newChip.innerHTML = '<span class="plus-icon">+</span> New Subnet';
    newChip.onclick = function () { selectChip(this); };
    subnetContainer.appendChild(newChip);
}

function updateEC2s(subnetName) {
    const ec2Container = document.getElementById('ec2-chips');

    // Clear any existing input in the EC2 section
    clearInput('ec2-chips');

    let instances = [];
    if (!subnetName) {
        // Show ALL EC2s if no Subnet selected
        instances = Object.values(subnetData).flat();
    } else {
        instances = subnetData[subnetName] || [];
    }

    ec2Container.innerHTML = '';

    instances.forEach(instance => {
        const chip = document.createElement('div');
        chip.className = 'glass-chip';
        chip.textContent = instance;
        chip.onclick = function () { selectChip(this); };
        ec2Container.appendChild(chip);
    });

    const newChip = document.createElement('div');
    newChip.className = 'glass-chip new-vpc-chip';
    newChip.innerHTML = '<span class="plus-icon">+</span> New EC2';
    newChip.onclick = function () { selectChip(this); };
    ec2Container.appendChild(newChip);
}

function clearEC2s() {
    const ec2Container = document.getElementById('ec2-chips');

    // Clear any existing input in the EC2 section
    clearInput('ec2-chips');

    ec2Container.innerHTML = '';
    // Optionally add just the "New EC2" button or leave empty until subnet selected
    newChip.onclick = function () { selectChip(this); };
    ec2Container.appendChild(newChip);
}

function clearInput(containerId) {
    const container = document.getElementById(containerId);
    if (container) {
        const resourceGroup = container.closest('.resource-group');
        if (resourceGroup) {
            const existingInput = resourceGroup.querySelector('.new-resource-input-container');
            if (existingInput) {
                existingInput.remove();
            }
        }
    }
}
// Initialize Global Resource Counters (S3, ECR)
document.addEventListener('DOMContentLoaded', () => {
    // Generate random 8-character string
    const generateRandomString = () => {
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    };

    // Initialize help icons in section headers
    const initializeHelpIcon = (helpIconId, tooltipContent) => {
        const helpIconContainer = document.getElementById(helpIconId);
        if (!helpIconContainer) return;

        const helpIcon = document.createElement('span');
        helpIcon.className = 'help-icon';
        helpIcon.textContent = '?';

        const tooltip = document.createElement('div');
        tooltip.className = 'glass-tooltip';
        tooltip.innerHTML = tooltipContent;

        helpIconContainer.appendChild(helpIcon);
        helpIconContainer.appendChild(tooltip);
        helpIconContainer.style.position = 'relative';
    };

    // Initialize S3 and ECR help icons
    initializeHelpIcon('s3-help-icon',
        '<strong>S3 Bucket Naming Rules:</strong><br>' +
        '• 3-63 characters long<br>' +
        '• Lowercase letters, numbers, hyphens, periods<br>' +
        '• Must start and end with letter or number<br>' +
        '• Globally unique across all AWS<br>' +
        '• No consecutive periods or IP format'
    );

    initializeHelpIcon('ecr-help-icon',
        '<strong>ECR Repository Naming Rules:</strong><br>' +
        '• 2-256 characters long<br>' +
        '• Lowercase letters, numbers, hyphens, underscores, periods, slashes<br>' +
        '• Must start with a letter<br>' +
        '• No double hyphens, underscores, or slashes'
    );

    const createCounter = (counterContainerId, chipsContainerId, resourceType, isS3 = false) => {
        const counterContainer = document.getElementById(counterContainerId);
        const chipsContainer = document.getElementById(chipsContainerId);
        if (!counterContainer || !chipsContainer) return;

        let count = 0;
        const inputs = []; // Track input elements or row containers

        const widget = document.createElement('div');
        widget.className = 'counter-widget';

        const minusBtn = document.createElement('button');
        minusBtn.className = 'counter-btn';
        minusBtn.textContent = '-';
        minusBtn.disabled = true; // Initial state

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'counter-value';
        valueDisplay.textContent = '0';

        const plusBtn = document.createElement('button');
        plusBtn.className = 'counter-btn';
        plusBtn.textContent = '+';

        // Helper to create input element
        const createInput = (index, value = '') => {
            if (isS3) {
                // Complex row for S3 with random suffix
                const rowContainer = document.createElement('div');
                rowContainer.className = 's3-input-row';
                rowContainer.style.display = 'flex';
                rowContainer.style.alignItems = 'center';
                rowContainer.style.gap = '0.5rem';
                rowContainer.style.marginBottom = '0.5rem';

                const inputSection = document.createElement('div');
                inputSection.style.flex = '1';
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'glass-input global-resource-input';
                input.placeholder = `Bucket Prefix ${index + 1}`;
                input.value = value.split('-')[0] || ''; // Try to extract prefix
                inputSection.appendChild(input);

                const plusOperator = document.createElement('span');
                plusOperator.textContent = '+';
                plusOperator.style.opacity = '0.5';

                const randomSection = document.createElement('div');
                randomSection.className = 's3-random-suffix';
                // Try to get existing random or generate new
                const randomPart = value.includes('-') ? value.split('-').pop() : generateRandomString();
                randomSection.textContent = randomPart;

                const equalsOperator = document.createElement('span');
                equalsOperator.textContent = '=';
                equalsOperator.style.opacity = '0.5';

                const resultSection = document.createElement('div');
                resultSection.className = 's3-result-section';
                resultSection.textContent = value || (input.value ? input.value + '-' + randomPart : `Unnamed-${randomPart}`);

                // Update result when input changes and refresh available list
                input.addEventListener('input', () => {
                    resultSection.textContent = input.value ? input.value + '-' + randomPart : `Unnamed-${randomPart}`;
                    updateAvailableList();
                    renderManifestTree();
                });

                rowContainer.appendChild(inputSection);
                rowContainer.appendChild(plusOperator);
                rowContainer.appendChild(randomSection);
                rowContainer.appendChild(equalsOperator);
                rowContainer.appendChild(resultSection);

                return rowContainer;
            } else {
                // Simple input for ECR
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'glass-input global-resource-input';
                input.placeholder = `${resourceType} ${index + 1}`;
                input.value = value;
                input.style.marginTop = '0.5rem';
                input.style.width = '100%';

                // Update available list when input changes
                input.addEventListener('input', () => {
                    updateAvailableList();
                    renderManifestTree();
                });

                return input;
            }
        };

        const updateInputs = () => {
            // Add inputs for initial data if any, only if inputs array is empty
            if (initialData.length > 0 && inputs.length === 0) {
                initialData.forEach((val, idx) => {
                    const input = createInput(idx, val);
                    inputs.push(input);
                    chipsContainer.appendChild(input);
                });
            }

            // Sync inputs with count
            while (inputs.length < count) {
                const newInput = createInput(inputs.length);
                inputs.push(newInput);
                chipsContainer.appendChild(newInput);
            }
            while (inputs.length > count) {
                const removedInput = inputs.pop();
                chipsContainer.removeChild(removedInput);
            }
            updateAvailableList();
        };

        const updateAvailableList = () => {
            const listId = isS3 ? 's3-available-list' : 'ecr-available-list';
            const availableList = document.getElementById(listId);
            if (!availableList) return;

            if (inputs.length === 0) {
                // Reset to default message
                availableList.innerHTML = '<div style="color: var(--text-muted); font-style: italic;">No resources created yet</div>';
                availableList.style.display = 'block';
                availableList.style.textAlign = 'center';
                return;
            }

            // Clear and add resource names as chips
            availableList.innerHTML = '';
            availableList.style.display = 'flex';
            availableList.style.flexWrap = 'wrap';
            availableList.style.gap = '0.5rem';
            availableList.style.justifyContent = 'center';

            // Collect all resource names
            inputs.forEach((inputElement, idx) => {
                let resourceName = '';

                if (isS3) {
                    // For S3, get the result from the third section
                    const resultSection = inputElement.querySelector('.s3-result-section');
                    if (resultSection) {
                        resourceName = resultSection.textContent || `Unnamed-${idx + 1}`;
                    }
                } else {
                    // For ECR, get the value from the input
                    resourceName = inputElement.value || `Unnamed-${idx + 1}`;
                }

                const chip = document.createElement('div');
                chip.className = 'action-chip';
                chip.style.fontFamily = 'monospace';
                chip.style.fontSize = '0.8rem';
                chip.style.cursor = 'default';
                chip.textContent = resourceName;
                availableList.appendChild(chip);
            });
        };

        const updateState = () => {
            valueDisplay.textContent = count;
            minusBtn.disabled = count <= 0;
            plusBtn.disabled = count >= 5;
            updateInputs();
            renderManifestTree();
        };

        minusBtn.onclick = () => {
            if (count > 0) {
                count--;
                updateState();
            }
        };

        plusBtn.onclick = () => {
            if (count < 5) {
                count++;
                updateState();
            }
        };

        widget.appendChild(minusBtn);
        widget.appendChild(valueDisplay);
        widget.appendChild(plusBtn);
        counterContainer.appendChild(widget);
    };

    // Global counters will be initialized via initGlobalCounters() called after JSON load.

    // Repositories Section Logic
    function renderAvailableRepos() {
        const container = document.getElementById('available-repos-list');
        if (!container) return;

        container.innerHTML = '';

        const repos = appData.repositories || [];
        if (repos.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'active-green-container placeholder-row';
            placeholder.style.marginTop = '0';
            placeholder.innerHTML = '<div style="color: var(--text-muted); font-style: italic; text-align: center; width: 100%;">No repositories available yet</div>';
            container.appendChild(placeholder);
            return;
        }

        repos.forEach(repo => {
            const row = document.createElement('div');
            row.className = 'active-green-container';
            row.style.marginTop = '0';
            row.id = `repo-source-${repo.name}`; // ID for connection source

            const resources = repo.resources.split(',').map(r => r.trim());
            const chipsHtml = resources.map(res => `<div class="action-chip" style="font-size: 0.9rem; cursor: default; margin: 2px;">${res}</div>`).join('');

            row.innerHTML = `
                <div style="display: flex; width: 100%; gap: 1rem; align-items: center;">
                    <div style="flex: 1; border-right: 1px solid rgba(255, 255, 255, 0.3); padding-right: 1rem;">
                        <div style="color: #fff; text-align: center; font-weight: 500;">${repo.name}</div>
                    </div>
                    <div style="flex: 1; padding-left: 1rem; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px;">
                        ${chipsHtml}
                    </div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    renderAvailableRepos();

    function renderInstances() {
        const container = document.getElementById('instances-list-container');
        if (!container) return;

        container.innerHTML = '';

        const instances = appData.instances || [];
        if (instances.length === 0) {
            const placeholder = document.createElement('div');
            placeholder.className = 'active-green-container placeholder-row';
            placeholder.style.marginTop = '0';
            placeholder.innerHTML = '<div style="color: var(--text-muted); font-style: italic; text-align: center; width: 100%;">No instances available yet</div>';
            container.appendChild(placeholder);
            return;
        }

        instances.forEach(instance => {
            const row = document.createElement('div');
            row.className = 'active-green-container';
            row.style.marginTop = '0';
            row.id = `instance-target-${instance.name}`; // ID for connection target

            const repos = instance.repos.split(',').map(r => r.trim());
            const reposChips = repos.map(r => `<div class="action-chip" style="font-size: 0.9rem; cursor: default; margin: 2px;">${r}</div>`).join('');

            const configSectionsHtml = instance.configGroups.map((group, idx) => `
                <div style="width: 100%; text-align: center; ${idx < instance.configGroups.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 0.5rem; margin-bottom: 0.5rem;' : ''}">
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 4px;">
                        ${group.values.map(v => `<div class="action-chip" style="font-size: 0.85rem; padding: 0.3rem 0.6rem; cursor: default; margin: 1px;">${v}</div>`).join('')}
                    </div>
                </div>
            `).join('');

            row.innerHTML = `
                <div style="width: 100%;">
                    <div style="text-align: center; text-decoration: underline; font-weight: 600; margin-bottom: 1rem; color: #fff;">${instance.name}</div>
                    <div style="display: flex; width: 100%; gap: 1rem; align-items: stretch;">
                        <div style="flex: 1; border-right: 1px solid rgba(255, 255, 255, 0.3); padding-right: 1rem; display: flex; flex-wrap: wrap; justify-content: center; align-content: center; gap: 4px;">
                            ${reposChips}
                        </div>
                        <div style="flex: 1; padding-left: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: space-between;">
                            ${configSectionsHtml}
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(row);
        });
    }

    function drawConnections() {
        const svg = document.getElementById('connection-svg');
        if (!svg) return;

        // Remove only path elements to preserve <defs>
        const paths = svg.querySelectorAll('path.connection-path');
        paths.forEach(p => p.remove());


        const layoutContainer = document.querySelector('.repositories-layout');
        if (!layoutContainer) return;

        const containerRect = layoutContainer.getBoundingClientRect();

        availableInstances.forEach(instance => {
            const targetEl = document.getElementById(`instance-target-${instance.name}`);
            if (!targetEl) return;

            const targetRect = targetEl.getBoundingClientRect();
            const repos = instance.repos.split(',').map(r => r.trim());

            repos.forEach(repoName => {
                const sourceEl = document.getElementById(`repo-source-${repoName}`);
                if (!sourceEl) return;

                const sourceRect = sourceEl.getBoundingClientRect();

                // Calculate relative coordinates in SVG
                const startX = sourceRect.right - containerRect.left;
                const startY = sourceRect.top + (sourceRect.height / 2) - containerRect.top;

                const endX = targetRect.left - containerRect.left;
                const endY = targetRect.top + (targetRect.height / 2) - containerRect.top;

                // Create SVG Path
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

                // Create SVG Path with horizontal exit from source and angled entry at target
                // Quadratic Bezier Q cpX cpY endX endY
                const cpX = startX + (endX - startX) * 0.5;
                const d = `M ${startX} ${startY} Q ${cpX} ${startY} ${endX} ${endY}`;



                path.setAttribute('d', d);
                path.setAttribute('class', 'connection-path');
                path.setAttribute('fill', 'none');
                path.setAttribute('stroke', 'var(--green-blob-1)');
                path.setAttribute('stroke-width', '3');
                path.setAttribute('opacity', '0.6');
                path.setAttribute('marker-end', 'url(#arrowhead)');
                svg.appendChild(path);
            });
        });
    }

    renderInstances();
    setTimeout(drawConnections, 300);
    window.addEventListener('resize', drawConnections);
});

function selectDeployMethod(method) {
    if (!appData.deploy) return;

    // Update active state in data
    appData.deploy.active = method;

    // Update UI classes
    const options = document.querySelectorAll('.deploy-option');
    options.forEach(opt => {
        const optId = opt.id.replace('deploy-', '');
        if (optId === method) {
            opt.classList.add('active');
        } else {
            opt.classList.remove('active');
        }
    });

    console.log(`Switched deploy method to: ${method}`);
    renderManifestTree();
}

// Manifest Tree Logic
function renderManifestTree() {
    const root = document.getElementById('manifest-tree-root');
    const svg = document.getElementById('manifest-svg');
    if (!root || !svg) return;

    // Clear previous
    const levels = root.querySelectorAll('.tree-level');
    levels.forEach(l => l.remove());
    svg.innerHTML = '';

    const infraData = {
        name: 'Infrastructure',
        icon: '🌎',
        children: [
            {
                name: 'Compute resources',
                icon: '🖥️',
                children: Object.keys(vpcData).map(vpcName => ({
                    name: vpcName,
                    icon: '🌐',
                    children: (vpcData[vpcName] || []).map(subnetName => ({
                        name: subnetName,
                        icon: '📍',
                        children: (subnetData[subnetName] || []).map(ec2Name => ({
                            name: ec2Name,
                            icon: '📦',
                            meta: 't3.medium'
                        }))
                    }))
                }))
            },
            {
                name: 'Global resources',
                icon: '🌍',
                children: [
                    ...(document.getElementById('s3-available-list')?.querySelectorAll('.action-chip') || []).length > 0 ? [{
                        name: 'S3 Buckets',
                        icon: '📦',
                        children: Array.from(document.getElementById('s3-available-list').querySelectorAll('.action-chip')).map(chip => ({
                            name: chip.textContent,
                            icon: '🪣'
                        }))
                    }] : [],
                    ...(document.getElementById('ecr-available-list')?.querySelectorAll('.action-chip') || []).length > 0 ? [{
                        name: 'ECR Repositories',
                        icon: '🐳',
                        children: Array.from(document.getElementById('ecr-available-list').querySelectorAll('.action-chip')).map(chip => ({
                            name: chip.textContent,
                            icon: '📋'
                        }))
                    }] : []
                ]
            },
            {
                name: 'Deploy Context',
                icon: '🚀',
                children: document.querySelector('.deploy-option.active') ? [{
                    name: document.querySelector('.deploy-option.active .option-title').textContent,
                    icon: '⚙️',
                    meta: 'Active'
                }] : []
            }
        ]
    };

    const renderedNodes = [];

    // Helper to render level
    function renderLevel(nodes, depth) {
        if (!nodes || nodes.length === 0) return;

        const levelDiv = document.createElement('div');
        levelDiv.className = `tree-level level-${depth}`;
        root.appendChild(levelDiv);

        nodes.forEach(node => {
            const chip = document.createElement('div');
            chip.className = 'manifest-chip';
            chip.innerHTML = `<span class="chip-icon">${node.icon}</span><span class="chip-name">${node.name}</span>`;
            if (node.meta) {
                chip.innerHTML += `<span class="chip-meta">[${node.meta}]</span>`;
            }
            levelDiv.appendChild(chip);

            node.element = chip;
            renderedNodes.push({ node, depth });

            if (node.children) {
                renderLevel(node.children, depth + 1);
            }
        });
    }

    renderLevel([infraData], 0);

    // Draw connections after a short delay for layout calculation
    setTimeout(() => drawManifestConnections(infraData, svg), 100);
}

function drawManifestConnections(parent, svg) {
    if (!parent.children) return;

    parent.children.forEach(child => {
        if (parent.element && child.element) {
            const pRect = parent.element.getBoundingClientRect();
            const cRect = child.element.getBoundingClientRect();
            const rootRect = svg.getBoundingClientRect();

            const x1 = pRect.left + pRect.width / 2 - rootRect.left;
            const y1 = pRect.bottom - rootRect.top;
            const x2 = cRect.left + cRect.width / 2 - rootRect.left;
            const y2 = cRect.top - rootRect.top;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            // Vertical then horizontal then vertical line (or step-wise bezier)
            const midY = y1 + (y2 - y1) / 2;
            const d = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

            path.setAttribute('d', d);
            path.setAttribute('class', 'manifest-connection-line');
            svg.appendChild(path);
        }
        drawManifestConnections(child, svg);
    });
}

// Initial Tree Render
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(renderManifestTree, 500);
    window.addEventListener('resize', renderManifestTree);
});
