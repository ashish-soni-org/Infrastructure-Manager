document.addEventListener('DOMContentLoaded', () => {
    const instanceCountInput = document.getElementById('instanceCount');
    const generateFieldsButton = document.getElementById('generateFields');
    const instanceFieldsDiv = document.getElementById('instanceFields');
    const pipelineForm = document.getElementById('pipelineForm');
    const messageElement = document.getElementById('message');

    // --- Function to Generate Dynamic Fields ---
    const generateFields = () => {
        const count = parseInt(instanceCountInput.value);
        if (isNaN(count) || count < 1 || count > 10) return;

        instanceFieldsDiv.innerHTML = ''; // Clear previous fields

        for (let i = 1; i <= count; i++) {
            const html = `
                <div class="instance-card">
                    <h3>Instance ${i}</h3>
                    
                    <label for="name${i}">Instance Name (Comma Separated for Multiple):</label>
                    <input type="text" id="name${i}" name="instance_name_${i}" value="instance-${i}" required>
                    
                    <div class="checkbox-group">
                        <div>
                            <input type="checkbox" id="runner_check_${i}" name="runner_check_${i}">
                            <label for="runner_check_${i}">Runner Check Value</label>
                        </div>
                        
                        <div>
                            <input type="checkbox" id="bucket_required_${i}" name="bucket_required_${i}">
                            <label for="bucket_required_${i}">Bucket Required</label>
                        </div>
                        
                        <div>
                            <input type="checkbox" id="eip_required_${i}" name="eip_required_${i}">
                            <label for="eip_required_${i}">Elastic IP Required</label>
                        </div>
                    </div>
                    
                    <div id="bucket_name_field_${i}" style="display: none; margin-top: 10px;">
                        <label for="bucket_name_${i}">Bucket Name:</label>
                        <input type="text" id="bucket_name_${i}" name="bucket_name_${i}" placeholder="Enter bucket name">
                    </div>
                </div>
            `;
            instanceFieldsDiv.insertAdjacentHTML('beforeend', html);

            // Add listener to show/hide bucket name field
            document.getElementById(`bucket_required_${i}`).addEventListener('change', (e) => {
                const bucketField = document.getElementById(`bucket_name_field_${i}`);
                bucketField.style.display = e.target.checked ? 'block' : 'none';
                document.getElementById(`bucket_name_${i}`).required = e.target.checked;
            });
        }
    };

    // Initial field generation
    generateFields();
    generateFieldsButton.addEventListener('click', generateFields);


    // --- Function to Handle AJAX Submission ---
    pipelineForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        messageElement.classList.add('hidden');
        messageElement.classList.remove('success', 'error');

        const formData = new FormData(pipelineForm);
        const data = {};
        
        // 1. Aggregate form data into a structured JSON object
        const instanceCount = parseInt(instanceCountInput.value);
        const instances = [];

        for (let i = 1; i <= instanceCount; i++) {
            const instanceData = {
                name: formData.get(`instance_name_${i}`),
                runner_check: formData.has(`runner_check_${i}`),
                bucket_required: formData.has(`bucket_required_${i}`),
                bucket_name: formData.get(`bucket_name_${i}`) || '',
                eip_required: formData.has(`eip_required_${i}`),
            };
            instances.push(instanceData);
        }

        data.total_instances = instanceCount;
        data.instance_list = instances;
        
        // 2. Define the Target URL (This MUST be a secure backend endpoint)
        // **REPLACE THIS PLACEHOLDER URL WITH YOUR SECURE PIPELINE TRIGGER ENDPOINT**
        const targetUrl = 'https://your-secure-backend-service.com/trigger-pipeline'; 
        
        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Add authorization headers if required by your backend service
                },
                body: JSON.stringify({ event_data: data })
            });

            if (response.ok) {
                messageElement.textContent = 'Pipeline triggered successfully! Check the status in your CI/CD system.';
                messageElement.classList.add('success');
            } else {
                const errorText = await response.text();
                messageElement.textContent = `Pipeline trigger failed. Status: ${response.status}. Error: ${errorText}`;
                messageElement.classList.add('error');
            }

        } catch (error) {
            messageElement.textContent = `A network error occurred: ${error.message}`;
            messageElement.classList.add('error');
        }

        messageElement.classList.remove('hidden');
    });
});