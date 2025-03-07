// Initialize the application when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', function() {
    // Check if jsPDF is loaded
    if (typeof window.jspdf === 'undefined') {
        console.log('jsPDF library not loaded. Make sure the CDN link is working.');
    } else {
        console.log('jsPDF library loaded successfully');
    }
    
    // Initialize the PDF library
    let jsPDF;
    try {
        jsPDF = window.jspdf.jsPDF;
        console.log('jsPDF initialized successfully');
    } catch (error) {
        console.error('Error initializing jsPDF:', error);
    }
    
    // Get DOM elements
    const saveBtn = document.getElementById('save-btn');
    const printBtn = document.getElementById('print-btn');
    const companyLogo = document.getElementById('company-logo');
    const formSteps = document.querySelectorAll('.form-step');
    const nextBtns = document.querySelectorAll('#next-btn');
    const prevBtns = document.querySelectorAll('#prev-btn');
    const progressStepsContainer = document.querySelector('.progress-steps');
    const testModeToggle = document.getElementById('test-mode-toggle');
    const fillTestDataBtn = document.getElementById('fill-test-data-btn');
    const adminModeToggle = document.getElementById('admin-mode-toggle');
    const editSectionsBtn = document.getElementById('edit-sections-btn');
    const sectionEditorModal = document.getElementById('section-editor-modal');
    const closeModalBtn = document.querySelector('.close-modal');
    const addSectionBtn = document.getElementById('add-section-btn');
    const saveSectionsBtn = document.getElementById('save-sections-btn');
    const sectionsContainer = document.getElementById('sections-container');
    const form = document.getElementById('health-check-form');
    const healthCheckContainer = document.getElementById('health-check');
    const backToDashboardBtn = document.createElement('button');
    
    // Add back to dashboard button
    backToDashboardBtn.id = 'back-to-dashboard-btn';
    backToDashboardBtn.className = 'btn';
    backToDashboardBtn.innerHTML = '<i class="fas fa-arrow-left"></i> Back to Dashboard';
    backToDashboardBtn.style.marginRight = '10px';
    backToDashboardBtn.addEventListener('click', function() {
        window.location.href = 'dashboard.html';
    });
    
    // Insert the back button before the save button
    if (saveBtn && saveBtn.parentNode) {
        saveBtn.parentNode.insertBefore(backToDashboardBtn, saveBtn);
    }
    
    // Check if user is logged in
    const token = localStorage.getItem('token');
    if (!token) {
        // Redirect to login page if not logged in
        window.location.href = 'login.html';
        return;
    }
    
    // Store all health checks in local storage
    let healthChecks = [];
    let currentStep = 1;
    let currentSection = 0; // Track current section
    let testMode = false;
    let adminMode = false;
    let currentHealthCheckId = null;
    let viewMode = false;
    let editMode = false;
    
    // Default sections configuration
    let sectionsConfig = [
        {
            id: 'external',
            title: 'External',
            items: [
                { id: 'exterior_lights', title: 'Exterior Lights' },
                { id: 'bodywork', title: 'Bodywork' },
                { id: 'mirrors_glass', title: 'Mirrors/Glass' },
                { id: 'wiper_blade', title: 'Wiper Blade Condition' }
            ]
        },
        {
            id: 'internal',
            title: 'Internal',
            items: [
                { id: 'seatbelts', title: 'Seatbelts' },
                { id: 'radio', title: 'Radio' },
                { id: 'dash_clock', title: 'Dash-Clock Operation' },
                { id: 'central_locking', title: 'Central Locking' }
            ]
        },
        {
            id: 'lights_heating_electrical',
            title: 'Lights / Heating / Electrical',
            items: [
                { id: 'lights_internal', title: 'Lights – Internal' },
                { id: 'washers', title: 'Washers' },
                { id: 'horn', title: 'Horn' },
                { id: 'heating_aircon', title: 'Heating System – Air Con' }
            ]
        },
        {
            id: 'engine_compartments',
            title: 'Engine Compartments',
            items: [
                { id: 'coolant_level', title: 'Coolant Level' },
                { id: 'brake_fluid', title: 'Brake Fluid' },
                { id: 'battery_condition', title: 'Battery Condition' },
                { id: 'aux_belt', title: 'Aux. Belt Condition' }
            ]
        },
        {
            id: 'wheels_tyres',
            title: 'Wheels and Tyres',
            items: [
                { id: 'front_left_tyre', title: 'Front Left Tyre' },
                { id: 'front_right_tyre', title: 'Front Right Tyre' },
                { id: 'rear_left_tyre', title: 'Rear Left Tyre' },
                { id: 'rear_right_tyre', title: 'Rear Right Tyre' },
                { id: 'spare_wheel', title: 'Spare Wheel' }
            ]
        },
        {
            id: 'brakes_hubs',
            title: 'Brakes / Hubs',
            items: [
                { id: 'front_brake_pads', title: 'Front Brake Pads' },
                { id: 'front_brake_discs', title: 'Front Brake Discs' },
                { id: 'rear_brake_pads', title: 'Rear Brake Pads' },
                { id: 'rear_brake_discs', title: 'Rear Brake Discs' }
            ]
        },
        {
            id: 'underside_vehicle',
            title: 'Underside Vehicle',
            items: [
                { id: 'brake_pipes_cables', title: 'Brake Pipes & Cables' },
                { id: 'oil_leaks', title: 'Oil Leaks' },
                { id: 'exhaust_condition', title: 'Exhaust Condition' },
                { id: 'underbody_damage', title: 'Underbody Damage' }
            ]
        },
        {
            id: 'steering_suspension',
            title: 'Steering / Suspension',
            items: [
                { id: 'driveshaft', title: 'Driveshaft' },
                { id: 'suspension', title: 'Suspension' },
                { id: 'springs_struts', title: 'Springs / Struts' },
                { id: 'steering_rack', title: 'Steering Rack' }
            ]
        }
    ];
    
    // Force update the localStorage with the correct configuration
    localStorage.setItem('sectionsConfig', JSON.stringify(sectionsConfig));
    
    // Build the health check sections
    rebuildHealthCheckSections();
    
    // Check URL parameters for mode and ID
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    const id = urlParams.get('id');
    
    if (mode === 'view' && id) {
        viewMode = true;
        currentHealthCheckId = id;
        loadHealthCheck(id);
    } else if (mode === 'edit' && id) {
        editMode = true;
        currentHealthCheckId = id;
        loadHealthCheck(id);
    }
    
    // Function to load a health check from the database
    async function loadHealthCheck(id) {
        try {
            const response = await fetch(`/api/health-checks/${id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to load health check');
            }
            
            const healthCheck = await response.json();
            
            // Fill in vehicle information
            document.getElementById('vehicle-make').value = healthCheck.vehicle_make;
            document.getElementById('vehicle-model').value = healthCheck.vehicle_model;
            document.getElementById('vehicle-year').value = healthCheck.vehicle_year;
            document.getElementById('vehicle-reg').value = healthCheck.vehicle_reg;
            document.getElementById('vehicle-mileage').value = healthCheck.vehicle_mileage;
            document.getElementById('vehicle-vin').value = healthCheck.vehicle_vin || '';
            
            // Fill in technician notes
            document.getElementById('technician-notes').value = healthCheck.technician_notes || '';
            
            // Fill in health check items
            if (healthCheck.items && healthCheck.items.length > 0) {
                healthCheck.items.forEach(item => {
                    // Find the section and item in the sectionsConfig
                    const sectionTitle = item.section;
                    const itemTitle = item.item;
                    
                    // Find the section by title
                    const sectionConfig = sectionsConfig.find(s => s.title === sectionTitle);
                    if (sectionConfig) {
                        // Find the item by title
                        const itemConfig = sectionConfig.items.find(i => i.title === itemTitle);
                        if (itemConfig) {
                            // Set the status and notes
                            const statusElement = document.getElementById(`check-${sectionConfig.id}-${itemConfig.id}`);
                            const notesElement = document.getElementById(`notes-${sectionConfig.id}-${itemConfig.id}`);
                            
                            if (statusElement) statusElement.value = item.status;
                            if (notesElement) notesElement.value = item.notes || '';
                        }
                    }
                });
            }
            
            // If in view mode, disable all inputs
            if (viewMode) {
                const inputs = document.querySelectorAll('input, select, textarea');
                inputs.forEach(input => {
                    input.disabled = true;
                });
                
                // Hide save button
                if (saveBtn) saveBtn.style.display = 'none';
                
                // Add a heading to indicate view mode
                const heading = document.createElement('div');
                heading.className = 'view-mode-heading';
                heading.innerHTML = '<h2>View Mode - Health Check #' + healthCheck.id + '</h2>';
                heading.style.backgroundColor = '#17a2b8';
                heading.style.color = 'white';
                heading.style.padding = '10px';
                heading.style.marginBottom = '20px';
                heading.style.borderRadius = '4px';
                heading.style.textAlign = 'center';
                
                // Insert at the top of the form
                if (form) {
                    form.insertBefore(heading, form.firstChild);
                }
            }
            
            // If in edit mode, add a heading to indicate edit mode
            if (editMode) {
                const heading = document.createElement('div');
                heading.className = 'edit-mode-heading';
                heading.innerHTML = '<h2>Edit Mode - Health Check #' + healthCheck.id + '</h2>';
                heading.style.backgroundColor = '#ffc107';
                heading.style.color = '#212529';
                heading.style.padding = '10px';
                heading.style.marginBottom = '20px';
                heading.style.borderRadius = '4px';
                heading.style.textAlign = 'center';
                
                // Insert at the top of the form
                if (form) {
                    form.insertBefore(heading, form.firstChild);
                }
            }
            
        } catch (error) {
            console.error('Error loading health check:', error);
            alert('Error: ' + error.message);
            
            // Redirect to dashboard if there's an error
            window.location.href = 'dashboard.html';
        }
    }
    
    // Initialize progress bar based on number of steps
    updateProgressBar();
    
    // Initialize section navigation if we're on step 2
    if (currentStep === 2) {
        showCurrentSection();
    }
    
    // Test mode toggle event
    testModeToggle.addEventListener('change', function() {
        testMode = this.checked;
        
        // Update UI to reflect test mode
        if (testMode) {
            document.querySelector('.test-mode-container').classList.add('active');
            fillTestDataBtn.style.display = 'block';
            console.log('Test mode enabled - validation will be skipped');
        } else {
            document.querySelector('.test-mode-container').classList.remove('active');
            fillTestDataBtn.style.display = 'none';
            console.log('Test mode disabled - validation is active');
        }
    });
    
    // Initially hide the fill test data button
    fillTestDataBtn.style.display = 'none';
    
    // Fill test data button event
    fillTestDataBtn.addEventListener('click', fillWithTestData);
    
    // Admin mode toggle event
    adminModeToggle.addEventListener('change', function() {
        adminMode = this.checked;
        
        if (adminMode) {
            editSectionsBtn.style.display = 'block';
            console.log('Admin mode enabled');
        } else {
            editSectionsBtn.style.display = 'none';
            console.log('Admin mode disabled');
        }
    });
    
    // Edit sections button click
    editSectionsBtn.addEventListener('click', function() {
        openSectionEditor();
    });
    
    // Initially hide the edit sections button
    editSectionsBtn.style.display = 'none';
    
    // Close modal button click
    closeModalBtn.addEventListener('click', function() {
        sectionEditorModal.style.display = 'none';
    });
    
    // Add section button click
    addSectionBtn.addEventListener('click', function() {
        const newSection = {
            id: 'section_' + Date.now(),
            title: 'New Section',
            items: [{ id: 'item_' + Date.now(), title: 'New Item' }]
        };
        sectionsConfig.push(newSection);
        renderSectionEditor();
    });
    
    // Save sections button click
    saveSectionsBtn.addEventListener('click', function() {
        localStorage.setItem('sectionsConfig', JSON.stringify(sectionsConfig));
        rebuildHealthCheckSections();
        sectionEditorModal.style.display = 'none';
        alert('Sections saved successfully!');
    });
    
    // Click outside modal to close
    window.addEventListener('click', function(event) {
        if (event.target === sectionEditorModal) {
            sectionEditorModal.style.display = 'none';
        }
    });
    
    // Navigation button events
    nextBtns.forEach(button => {
        // Skip buttons in step 2 as they are handled by updateSectionNavigation
        if (button.closest('#step-2')) return;
        
        button.addEventListener('click', function() {
            console.log('Next button clicked, current step:', currentStep);
            if (validateStep(currentStep) || testMode) {
                changeStep(currentStep + 1);
            }
        });
    });
    
    prevBtns.forEach(button => {
        // Skip buttons in step 2 as they are handled by updateSectionNavigation
        if (button.closest('#step-2')) return;
        
        button.addEventListener('click', function() {
            console.log('Previous button clicked, current step:', currentStep);
            changeStep(currentStep - 1);
        });
    });
    
    // Save button event
    if (saveBtn) {
        saveBtn.addEventListener('click', function() {
            if (validateAllSteps()) {
                saveHealthCheck();
            } else {
                alert('Please fill in all required fields before saving.');
            }
        });
    }
    
    // Print button event
    if (printBtn) {
        printBtn.addEventListener('click', function() {
            if (validateAllSteps() || testMode) {
                printHealthCheck();
            }
        });
    }
    
    // Function to print health check
    function printHealthCheck() {
        // Create a new window for the report
        const printWindow = window.open('', '_blank');
        
        // Get vehicle information
        const vehicleMake = document.getElementById('vehicle-make').value || 'Not specified';
        const vehicleModel = document.getElementById('vehicle-model').value || 'Not specified';
        const vehicleYear = document.getElementById('vehicle-year').value || 'Not specified';
        const vehicleReg = document.getElementById('vehicle-reg').value || 'Not specified';
        const vehicleMileage = document.getElementById('vehicle-mileage').value || 'Not specified';
        const vehicleVin = document.getElementById('vehicle-vin').value || 'Not specified';
        
        // Get technician notes
        const technicianNotes = document.getElementById('technician-notes').value || 'No additional notes.';
        
        // Start building the HTML content
        let reportContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Vehicle Health Check Report - ${vehicleReg}</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                    max-width: 1000px;
                    margin: 0 auto;
                    padding: 20px;
                }
                .header {
                    text-align: center;
                    margin-bottom: 20px;
                }
                .logo {
                    max-width: 150px;
                    margin-bottom: 10px;
                }
                h1 {
                    color: #3498db;
                    margin: 10px 0;
                }
                .date {
                    color: #777;
                    margin-bottom: 20px;
                }
                .vehicle-info {
                    background-color: #f8f9fa;
                    border-radius: 5px;
                    padding: 15px;
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                }
                .vehicle-info h2 {
                    margin-top: 0;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                .vehicle-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    gap: 10px;
                }
                .vehicle-item {
                    margin-bottom: 5px;
                }
                .vehicle-item strong {
                    font-weight: bold;
                }
                .section {
                    margin-bottom: 20px;
                    border: 1px solid #ddd;
                    border-radius: 5px;
                    overflow: hidden;
                    page-break-inside: avoid;
                }
                .section-header {
                    background-color: #3498db !important;
                    color: white !important;
                    padding: 10px 15px;
                    font-weight: bold;
                    font-size: 16px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .section-content {
                    padding: 0;
                }
                .items-grid {
                    display: grid;
                    grid-template-columns: repeat(1, 1fr);
                }
                .check-item {
                    padding: 12px 15px;
                    border-bottom: 1px solid #eee;
                    display: grid;
                    grid-template-columns: 2fr 1fr;
                    gap: 15px;
                    align-items: center;
                }
                .check-item:last-child {
                    border-bottom: none;
                }
                .item-title {
                    font-weight: bold;
                }
                .item-status {
                    display: inline-block;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-weight: bold;
                    text-align: center;
                    min-width: 80px;
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                .status-good {
                    background-color: #2ecc71 !important;
                    color: white !important;
                }
                .status-fair {
                    background-color: #f39c12 !important;
                    color: white !important;
                }
                .status-poor {
                    background-color: #e74c3c !important;
                    color: white !important;
                }
                .status-notchecked {
                    background-color: #bbb !important;
                    color: white !important;
                }
                .item-notes {
                    grid-column: span 2;
                    font-style: italic;
                    color: #666;
                    padding-top: 5px;
                    border-top: 1px dashed #eee;
                }
                .technician-notes {
                    background-color: #f8f9fa;
                    border-radius: 5px;
                    padding: 15px;
                    margin-top: 20px;
                    border: 1px solid #ddd;
                    page-break-inside: avoid;
                }
                .technician-notes h2 {
                    margin-top: 0;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                }
                .test-mode-indicator {
                    text-align: center;
                    color: #999;
                    margin-top: 30px;
                    font-style: italic;
                }
                @media print {
                    body {
                        padding: 0;
                        margin: 0;
                    }
                    .section, .vehicle-info, .technician-notes {
                        page-break-inside: avoid;
                    }
                    .section-header, .item-status {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                        color-adjust: exact !important;
                    }
                    .status-good {
                        background-color: #2ecc71 !important;
                        color: white !important;
                        border: 1px solid #2ecc71;
                    }
                    .status-fair {
                        background-color: #f39c12 !important;
                        color: white !important;
                        border: 1px solid #f39c12;
                    }
                    .status-poor {
                        background-color: #e74c3c !important;
                        color: white !important;
                        border: 1px solid #e74c3c;
                    }
                    .status-notchecked {
                        background-color: #bbb !important;
                        color: white !important;
                        border: 1px solid #bbb;
                    }
                    .section-header {
                        background-color: #3498db !important;
                        color: white !important;
                        border-bottom: 1px solid #3498db;
                    }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <img src="sj-automotive-logo.png" alt="SJ Automotive Logo" class="logo">
                <h1>Vehicle Health Check Report</h1>
                <div class="date">Date: ${new Date().toLocaleDateString()}</div>
            </div>
            
            <div class="vehicle-info">
                <h2>Vehicle Information</h2>
                <div class="vehicle-grid">
                    <div class="vehicle-item"><strong>Make:</strong> ${vehicleMake}</div>
                    <div class="vehicle-item"><strong>Model:</strong> ${vehicleModel}</div>
                    <div class="vehicle-item"><strong>Year:</strong> ${vehicleYear}</div>
                    <div class="vehicle-item"><strong>Registration:</strong> ${vehicleReg}</div>
                    <div class="vehicle-item"><strong>Mileage:</strong> ${vehicleMileage}</div>
                    <div class="vehicle-item"><strong>VIN:</strong> ${vehicleVin}</div>
                </div>
            </div>
        `;
        
        // Add health check sections
        sectionsConfig.forEach(section => {
            reportContent += `
            <div class="section">
                <div class="section-header">${section.title}</div>
                <div class="section-content">
                    <div class="items-grid">
            `;
            
            section.items.forEach(item => {
                const inputId = `check-${section.id}-${item.id}`;
                const input = document.getElementById(inputId);
                if (!input) return;
                
                const status = input.value || 'Not checked';
                const notesTextarea = document.getElementById(`notes-${section.id}-${item.id}`);
                const notes = notesTextarea ? notesTextarea.value || '' : '';
                
                let statusClass = 'status-notchecked';
                if (status === 'good') statusClass = 'status-good';
                if (status === 'fair') statusClass = 'status-fair';
                if (status === 'poor') statusClass = 'status-poor';
                
                reportContent += `
                    <div class="check-item">
                        <div class="item-title">${item.title}</div>
                        <div class="item-status ${statusClass}">${status.toUpperCase()}</div>
                        ${notes ? `<div class="item-notes">Notes: ${notes}</div>` : ''}
                    </div>
                `;
            });
            
            reportContent += `
                    </div>
                </div>
            </div>
            `;
        });
        
        // Add technician notes
        reportContent += `
            <div class="technician-notes">
                <h2>Notes from Technician</h2>
                <p>${technicianNotes.replace(/\n/g, '<br>')}</p>
            </div>
        `;
        
        // Add test mode indicator if applicable
        if (testMode) {
            reportContent += `
            <div class="test-mode-indicator">
                This report was generated in Test Mode
            </div>
            `;
        }
        
        // Close the HTML
        reportContent += `
        </body>
        </html>
        `;
        
        // Write the content to the new window
        printWindow.document.open();
        printWindow.document.write(reportContent);
        printWindow.document.close();
        
        // Wait for resources to load then print
        printWindow.onload = function() {
            setTimeout(function() {
                printWindow.print();
            }, 500);
        };
    }
    
    // Function to change step
    function changeStep(stepNumber) {
        console.log('Changing to step:', stepNumber);
        
        // Validate current step before proceeding (unless in test mode)
        if (stepNumber > currentStep && !validateStep(currentStep) && !testMode) {
            return;
        }
        
        // Ensure step number is within valid range
        if (stepNumber < 1 || stepNumber > formSteps.length) {
            console.log('Step number out of range:', stepNumber);
            return;
        }
        
        // Special handling for step 2 (health check items)
        if (stepNumber === 2) {
            // If coming from step 1, reset to first section
            if (currentStep === 1) {
                currentSection = 0;
            }
            // Show only the current section
            showCurrentSection();
        } else {
            // For other steps, just show the step
            // Hide all steps
            formSteps.forEach(step => {
                step.classList.remove('active');
            });
            
            // Show the selected step
            formSteps[stepNumber - 1].classList.add('active');
        }
        
        // Update current step
        currentStep = stepNumber;
        
        // Update progress bar
        updateProgressBar();
    }
    
    // Function to show only the current section
    function showCurrentSection() {
        // First, make step 2 active
        formSteps.forEach(step => {
            step.classList.remove('active');
        });
        formSteps[1].classList.add('active');
        
        // Then, show only the current section
        const sections = document.querySelectorAll('.check-category');
        if (sections.length === 0) return;
        
        sections.forEach((section, index) => {
            if (index === currentSection) {
                section.style.display = 'block';
            } else {
                section.style.display = 'none';
            }
        });
        
        // Update navigation buttons
        updateSectionNavigation();
    }
    
    // Function to update section navigation
    function updateSectionNavigation() {
        const sections = document.querySelectorAll('.check-category');
        if (sections.length === 0) return;
        
        // Get navigation buttons in step 2
        const prevBtn = formSteps[1].querySelector('#prev-btn');
        const nextBtn = formSteps[1].querySelector('#next-btn');
        
        // Update button text and behavior based on current section
        if (currentSection === 0) {
            // First section
            prevBtn.textContent = 'Previous: Vehicle Info';
            nextBtn.textContent = currentSection < sections.length - 1 ? 
                'Next: ' + sections[currentSection + 1].querySelector('h3').textContent : 'Next: Technician Notes';
        } else if (currentSection === sections.length - 1) {
            // Last section
            prevBtn.textContent = 'Previous: ' + sections[currentSection - 1].querySelector('h3').textContent;
            nextBtn.textContent = 'Next: Technician Notes';
        } else {
            // Middle sections
            prevBtn.textContent = 'Previous: ' + sections[currentSection - 1].querySelector('h3').textContent;
            nextBtn.textContent = 'Next: ' + sections[currentSection + 1].querySelector('h3').textContent;
        }
        
        // Add event listeners to the navigation buttons in step 2
        prevBtn.onclick = function() {
            if (currentSection > 0) {
                currentSection--;
                showCurrentSection();
            } else {
                // If we're at the first section, go back to step 1
                changeStep(1);
            }
        };
        
        nextBtn.onclick = function() {
            if (currentSection < sections.length - 1) {
                currentSection++;
                showCurrentSection();
            } else {
                // If we're at the last section, go to step 3
                changeStep(3);
            }
        };
    }
    
    // Function to update progress bar
    function updateProgressBar() {
        // Clear existing progress steps
        progressStepsContainer.innerHTML = '';
        
        // Create progress bar
        const progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressStepsContainer.appendChild(progressBar);
        
        // Get all sections
        const sections = sectionsConfig;
        
        // Calculate total steps (Vehicle Info + All Sections + Technician Notes)
        const totalSteps = 2 + sections.length;
        
        // Calculate current overall step
        let overallCurrentStep = 1; // Start with Vehicle Info
        
        if (currentStep === 2) {
            // In health check sections
            overallCurrentStep = 1 + currentSection + 1;
        } else if (currentStep === 3) {
            // In technician notes
            overallCurrentStep = totalSteps;
        }
        
        // Create progress indicator
        const progress = document.createElement('div');
        progress.className = 'progress';
        progress.style.width = ((overallCurrentStep - 1) / (totalSteps - 1)) * 100 + '%';
        progressBar.appendChild(progress);
        
        // Create steps
        // Step 1: Vehicle Info
        const vehicleStep = document.createElement('div');
        vehicleStep.className = 'progress-step';
        if (overallCurrentStep > 1) {
            vehicleStep.classList.add('completed');
        } else if (overallCurrentStep === 1) {
            vehicleStep.classList.add('active');
        }
        vehicleStep.textContent = '1';
        vehicleStep.title = 'Vehicle Information';
        vehicleStep.addEventListener('click', () => changeStep(1));
        progressBar.appendChild(vehicleStep);
        
        // Steps for each section
        sections.forEach((section, index) => {
            const stepNumber = index + 2; // Start from 2 (after Vehicle Info)
            const sectionStep = document.createElement('div');
            sectionStep.className = 'progress-step';
            
            if (overallCurrentStep > stepNumber) {
                sectionStep.classList.add('completed');
            } else if (overallCurrentStep === stepNumber) {
                sectionStep.classList.add('active');
            }
            
            sectionStep.textContent = stepNumber;
            sectionStep.title = section.title;
            
            // Add click event to navigate to this section
            sectionStep.addEventListener('click', () => {
                changeStep(2); // Go to health check step
                currentSection = index; // Set the current section
                showCurrentSection(); // Show the selected section
            });
            
            progressBar.appendChild(sectionStep);
        });
        
        // Final step: Technician Notes
        const notesStep = document.createElement('div');
        notesStep.className = 'progress-step';
        if (overallCurrentStep === totalSteps) {
            notesStep.classList.add('active');
        }
        notesStep.textContent = totalSteps;
        notesStep.title = 'Technician Notes';
        notesStep.addEventListener('click', () => changeStep(3));
        progressBar.appendChild(notesStep);
    }
    
    // Function to validate a step
    function validateStep(step) {
        // If test mode is enabled, skip validation
        if (testMode) {
            return true;
        }
        
        let isValid = true;
        
        // Validate based on which step we're on
        if (step === 1) {
            // Validate vehicle information
            const requiredFields = [
                'vehicle-make',
                'vehicle-model',
                'vehicle-year',
                'vehicle-reg',
                'vehicle-mileage'
            ];
            
            requiredFields.forEach(field => {
                const input = document.getElementById(field);
                if (!input.value.trim()) {
                    input.classList.add('invalid');
                    isValid = false;
                } else {
                    input.classList.remove('invalid');
                }
            });
            
            if (!isValid) {
                alert('Please fill in all required vehicle information fields.');
            }
        } else if (step === 2) {
            // Validate health check items
            // For now, we'll just return true as this is optional
            isValid = true;
        }
        
        return isValid;
    }
    
    // Function to validate all steps
    function validateAllSteps() {
        // If test mode is enabled, skip validation
        if (testMode) {
            return true;
        }
        
        let isValid = true;
        
        // Validate vehicle information
        const requiredFields = [
            'vehicle-make',
            'vehicle-model',
            'vehicle-year',
            'vehicle-reg',
            'vehicle-mileage'
        ];
        
        requiredFields.forEach(field => {
            const input = document.getElementById(field);
            if (!input.value.trim()) {
                input.classList.add('invalid');
                isValid = false;
            } else {
                input.classList.remove('invalid');
            }
        });
        
        if (!isValid) {
            alert('Please fill in all required vehicle information fields.');
            changeStep(1); // Go back to vehicle information step
        }
        
        return isValid;
    }
    
    // Function to save health check
    async function saveHealthCheck() {
        // Get vehicle information
        const vehicleInfo = {
            make: document.getElementById('vehicle-make').value,
            model: document.getElementById('vehicle-model').value,
            year: document.getElementById('vehicle-year').value,
            reg: document.getElementById('vehicle-reg').value,
            mileage: document.getElementById('vehicle-mileage').value,
            vin: document.getElementById('vehicle-vin').value
        };
        
        // Get health check items
        const healthCheckItems = [];
        sectionsConfig.forEach(section => {
            section.items.forEach(item => {
                const status = document.getElementById(`check-${section.id}-${item.id}`).value;
                const notes = document.getElementById(`notes-${section.id}-${item.id}`).value;
                
                healthCheckItems.push({
                    section: section.title,
                    item: item.title,
                    status,
                    notes
                });
            });
        });
        
        // Get technician notes
        const technicianNotes = document.getElementById('technician-notes').value;
        
        try {
            let response;
            
            if (editMode && currentHealthCheckId) {
                // Update existing health check
                response = await fetch(`/api/health-checks/${currentHealthCheckId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        vehicleInfo,
                        healthCheckItems,
                        technicianNotes
                    })
                });
            } else {
                // Create new health check
                response = await fetch('/api/health-checks', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        vehicleInfo,
                        healthCheckItems,
                        technicianNotes
                    })
                });
            }
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to save health check');
            }
            
            const savedHealthCheck = await response.json();
            
            // Show success message
            alert(editMode ? 'Health check updated successfully!' : 'Health check saved successfully!');
            
            // Redirect to dashboard
            window.location.href = 'dashboard.html';
            
        } catch (error) {
            console.error('Error saving health check:', error);
            alert('Error: ' + error.message);
            
            // If unauthorized, redirect to login
            if (error.message.includes('Unauthorized') || error.message.includes('Forbidden')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        }
    }
    
    // Function to fill with test data
    function fillWithTestData() {
        // Fill vehicle information
        document.getElementById('vehicle-make').value = 'Toyota';
        document.getElementById('vehicle-model').value = 'Corolla';
        document.getElementById('vehicle-year').value = '2020';
        document.getElementById('vehicle-reg').value = 'ABC123';
        document.getElementById('vehicle-mileage').value = '25000';
        document.getElementById('vehicle-vin').value = 'JT2BF22K1W0123456';
        
        // Fill health check items with random statuses
        const statuses = ['good', 'fair', 'poor'];
        
        sectionsConfig.forEach(section => {
            section.items.forEach(item => {
                const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
                const hiddenInput = document.getElementById(`check-${section.id}-${item.id}`);
                const notesTextarea = document.getElementById(`notes-${section.id}-${item.id}`);
                
                if (hiddenInput) {
                    // Set random status
                    hiddenInput.value = randomStatus;
                    
                    // Update toggle button UI
                    const toggleButton = document.querySelector(`.status-toggle-${randomStatus}[data-item-id="${section.id}-${item.id}"]`);
                    if (toggleButton) {
                        // Remove active class from all siblings
                        const container = toggleButton.closest('.status-toggle-container');
                        container.querySelectorAll('.status-toggle').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        
                        // Add active class to selected button
                        toggleButton.classList.add('active');
                    }
                    
                    // Add notes based on status
                    if (notesTextarea) {
                        if (randomStatus === 'good') {
                            notesTextarea.value = 'No issues found.';
                        } else if (randomStatus === 'fair') {
                            notesTextarea.value = 'Minor issues noted, but still functional.';
                        } else {
                            notesTextarea.value = 'Requires attention. Recommend repair or replacement.';
                        }
                    }
                }
            });
        });
        
        // Fill technician notes
        document.getElementById('technician-notes').value = 'This is a test health check generated automatically. All data is fictional and for testing purposes only.';
        
        alert('Test data has been filled in. You can now navigate through the form or generate a PDF.');
    }
    
    // Function to open section editor
    function openSectionEditor() {
        renderSectionEditor();
        sectionEditorModal.style.display = 'block';
    }
    
    // Function to render section editor
    function renderSectionEditor() {
        sectionsContainer.innerHTML = '';
        
        sectionsConfig.forEach((section, sectionIndex) => {
            const sectionElement = document.createElement('div');
            sectionElement.className = 'editable-section';
            
            // Create section header
            const sectionHeader = document.createElement('div');
            sectionHeader.className = 'section-header';
            
            // Create section title input
            const sectionTitleInput = document.createElement('input');
            sectionTitleInput.type = 'text';
            sectionTitleInput.className = 'section-title-input';
            sectionTitleInput.value = section.title;
            sectionTitleInput.addEventListener('change', function() {
                sectionsConfig[sectionIndex].title = this.value;
            });
            
            // Create section actions
            const sectionActions = document.createElement('div');
            sectionActions.className = 'section-actions';
            
            // Create move up button
            const moveUpBtn = document.createElement('button');
            moveUpBtn.className = 'action-btn move-up-btn';
            moveUpBtn.innerHTML = '&#8593;';
            moveUpBtn.addEventListener('click', function() {
                moveSection(sectionIndex, 'up');
            });
            
            // Create move down button
            const moveDownBtn = document.createElement('button');
            moveDownBtn.className = 'action-btn move-down-btn';
            moveDownBtn.innerHTML = '&#8595;';
            moveDownBtn.addEventListener('click', function() {
                moveSection(sectionIndex, 'down');
            });
            
            // Create delete button
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'action-btn delete-btn';
            deleteBtn.innerHTML = '&#10005;';
            deleteBtn.addEventListener('click', function() {
                deleteSection(sectionIndex);
            });
            
            // Add buttons to section actions
            sectionActions.appendChild(moveUpBtn);
            sectionActions.appendChild(moveDownBtn);
            sectionActions.appendChild(deleteBtn);
            
            // Add title input and actions to section header
            sectionHeader.appendChild(sectionTitleInput);
            sectionHeader.appendChild(sectionActions);
            
            // Create section items container
            const sectionItems = document.createElement('div');
            sectionItems.className = 'section-items';
            
            // Add items to section
            section.items.forEach((item, itemIndex) => {
                const itemElement = createEditableItem(item, sectionIndex, itemIndex);
                sectionItems.appendChild(itemElement);
            });
            
            // Create add item button
            const addItemBtn = document.createElement('button');
            addItemBtn.className = 'action-btn add-item-btn';
            addItemBtn.textContent = 'Add Item';
            addItemBtn.addEventListener('click', function() {
                addItem(sectionIndex);
            });
            
            // Add elements to section
            sectionElement.appendChild(sectionHeader);
            sectionElement.appendChild(sectionItems);
            sectionElement.appendChild(addItemBtn);
            
            // Add section to container
            sectionsContainer.appendChild(sectionElement);
        });
    }
    
    // Function to create editable item
    function createEditableItem(item, sectionIndex, itemIndex) {
        const itemElement = document.createElement('div');
        itemElement.className = 'editable-item';
        
        // Create item title input
        const itemTitleInput = document.createElement('input');
        itemTitleInput.type = 'text';
        itemTitleInput.className = 'item-title-input';
        itemTitleInput.value = item.title;
        itemTitleInput.addEventListener('change', function() {
            sectionsConfig[sectionIndex].items[itemIndex].title = this.value;
        });
        
        // Create item actions
        const itemActions = document.createElement('div');
        itemActions.className = 'item-actions';
        
        // Create move up button
        const moveUpBtn = document.createElement('button');
        moveUpBtn.className = 'action-btn move-up-btn';
        moveUpBtn.innerHTML = '&#8593;';
        moveUpBtn.addEventListener('click', function() {
            moveItem(sectionIndex, itemIndex, 'up');
        });
        
        // Create move down button
        const moveDownBtn = document.createElement('button');
        moveDownBtn.className = 'action-btn move-down-btn';
        moveDownBtn.innerHTML = '&#8595;';
        moveDownBtn.addEventListener('click', function() {
            moveItem(sectionIndex, itemIndex, 'down');
        });
        
        // Create delete button
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'action-btn delete-btn';
        deleteBtn.innerHTML = '&#10005;';
        deleteBtn.addEventListener('click', function() {
            deleteItem(sectionIndex, itemIndex);
        });
        
        // Add buttons to item actions
        itemActions.appendChild(moveUpBtn);
        itemActions.appendChild(moveDownBtn);
        itemActions.appendChild(deleteBtn);
        
        // Add title input and actions to item
        itemElement.appendChild(itemTitleInput);
        itemElement.appendChild(itemActions);
        
        return itemElement;
    }
    
    // Function to move section
    function moveSection(sectionIndex, direction) {
        if (direction === 'up' && sectionIndex > 0) {
            // Swap with previous section
            [sectionsConfig[sectionIndex], sectionsConfig[sectionIndex - 1]] = 
            [sectionsConfig[sectionIndex - 1], sectionsConfig[sectionIndex]];
        } else if (direction === 'down' && sectionIndex < sectionsConfig.length - 1) {
            // Swap with next section
            [sectionsConfig[sectionIndex], sectionsConfig[sectionIndex + 1]] = 
            [sectionsConfig[sectionIndex + 1], sectionsConfig[sectionIndex]];
        }
        
        renderSectionEditor();
    }
    
    // Function to delete section
    function deleteSection(sectionIndex) {
        if (confirm('Are you sure you want to delete this section and all its items?')) {
            sectionsConfig.splice(sectionIndex, 1);
            renderSectionEditor();
        }
    }
    
    // Function to add item
    function addItem(sectionIndex) {
        const newItem = {
            id: 'item_' + Date.now(),
            title: 'New Item'
        };
        
        sectionsConfig[sectionIndex].items.push(newItem);
        renderSectionEditor();
    }
    
    // Function to move item
    function moveItem(sectionIndex, itemIndex, direction) {
        const items = sectionsConfig[sectionIndex].items;
        
        if (direction === 'up' && itemIndex > 0) {
            // Swap with previous item
            [items[itemIndex], items[itemIndex - 1]] = [items[itemIndex - 1], items[itemIndex]];
        } else if (direction === 'down' && itemIndex < items.length - 1) {
            // Swap with next item
            [items[itemIndex], items[itemIndex + 1]] = [items[itemIndex + 1], items[itemIndex]];
        }
        
        renderSectionEditor();
    }
    
    // Function to delete item
    function deleteItem(sectionIndex, itemIndex) {
        if (confirm('Are you sure you want to delete this item?')) {
            sectionsConfig[sectionIndex].items.splice(itemIndex, 1);
            renderSectionEditor();
        }
    }
    
    // Function to rebuild health check sections
    function rebuildHealthCheckSections() {
        if (!healthCheckContainer) return;
        
        healthCheckContainer.innerHTML = '';
        
        sectionsConfig.forEach(section => {
            // Create a section container
            const sectionElement = document.createElement('div');
            sectionElement.className = 'check-category';
            sectionElement.innerHTML = `<h3>${section.title}</h3>`;
            
            const itemsContainer = document.createElement('div');
            itemsContainer.className = 'check-items';
            
            section.items.forEach(item => {
                const itemElement = document.createElement('div');
                itemElement.className = 'check-item';
                
                // Create item HTML with toggle buttons
                const itemHTML = `
                    <div class="item-label">${item.title}:</div>
                    <div class="status-toggle-container">
                        <input type="hidden" id="check-${section.id}-${item.id}" required>
                        <button type="button" class="status-toggle status-toggle-good" data-status="good" data-item-id="${section.id}-${item.id}">
                            Good
                        </button>
                        <button type="button" class="status-toggle status-toggle-fair" data-status="fair" data-item-id="${section.id}-${item.id}">
                            Fair
                        </button>
                        <button type="button" class="status-toggle status-toggle-poor" data-status="poor" data-item-id="${section.id}-${item.id}">
                            Poor
                        </button>
                    </div>
                    <textarea class="item-notes" id="notes-${section.id}-${item.id}" placeholder="Add notes here..."></textarea>
                `;
                
                itemElement.innerHTML = itemHTML;
                
                // Add event listeners to toggle buttons
                const toggleButtons = itemElement.querySelectorAll('.status-toggle');
                const hiddenInput = itemElement.querySelector(`#check-${section.id}-${item.id}`);
                
                toggleButtons.forEach(button => {
                    button.addEventListener('click', function() {
                        const status = this.getAttribute('data-status');
                        const itemId = this.getAttribute('data-item-id');
                        
                        // Remove active class from all siblings
                        const container = this.closest('.status-toggle-container');
                        container.querySelectorAll('.status-toggle').forEach(btn => {
                            btn.classList.remove('active');
                        });
                        
                        // Add active class to clicked button
                        this.classList.add('active');
                        
                        // Update hidden input value
                        hiddenInput.value = status;
                    });
                });
                
                itemsContainer.appendChild(itemElement);
            });
            
            sectionElement.appendChild(itemsContainer);
            healthCheckContainer.appendChild(sectionElement);
        });
    }
}); 