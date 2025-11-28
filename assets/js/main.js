// Form Wizard State
let currentStep = 1;
let totalSteps = 12;
let formData = {
    vehicleType: '',
    budget: '',
    tradeIn: '',
    creditScore: '',
    employment: '',
    incomeType: '',
    annualIncome: '',
    incomeDuration: { years: 0, months: 0 },
    workplace: { company: '', jobTitle: '' },
    incomeVerified: false,
    contactInfo: {}
};

// Show Pre-Approval Form
function showPreApprovalForm() {
    console.log('showPreApprovalForm called');
    
    const heroBanner = document.querySelector('.hero-banner');
    const heroConfidence = document.querySelector('.hero-confidence-section');
    const formWizard = document.getElementById('formWizard');
    
    console.log('Elements found:', {
        heroBanner: !!heroBanner,
        heroConfidence: !!heroConfidence,
        formWizard: !!formWizard
    });
    
    if (heroBanner) heroBanner.style.display = 'none';
    if (heroConfidence) heroConfidence.style.display = 'none';
    if (formWizard) {
        formWizard.style.display = 'block';
        // Reset form to step 1
        if (currentStep !== 1) {
            document.getElementById(`step${currentStep}`).classList.remove('active');
            currentStep = 1;
            document.getElementById(`step${currentStep}`).classList.add('active');
            updateProgressBar();
        }
    } else {
        console.error('Form wizard not found!');
    }
}

// Show Sell Car Form
function showSellForm() {
    console.log('showSellForm function started');
    
    try {
        console.log('Inside try block');
        
        // Hide hero content and confidence section
        const heroConfidenceSection = document.querySelector('.hero-confidence-section');
        console.log('Hero confidence section found:', !!heroConfidenceSection);
        if (heroConfidenceSection) {
            heroConfidenceSection.style.display = 'none';
        }
        
        // Hide choice buttons
        const choiceButtons = document.querySelector('.hero-choice-buttons');
        console.log('Choice buttons found:', !!choiceButtons);
        if (choiceButtons) {
            choiceButtons.style.display = 'none';
        }
        
        // Show sell car form
        const sellFormHtml = `
        <div class="sell-car-wizard" id="sellCarWizard">
            <div class="sell-car-header">
                <h2 class="sell-title">Sell Your Car to Green Light Automotive</h2>
                <p class="sell-subtitle">Get an instant offer by providing photos and details of your vehicle</p>
            </div>
            
            <div class="sell-car-steps">
                <h3>Step 1: Take Photos of Your Vehicle</h3>
                <p class="photo-instructions">Please take clear photos of all required angles. Make sure photos are well-lit and show the entire side of the vehicle.</p>
                
                <div class="sell-car-upload-grid">
                    <!-- Front of Vehicle -->
                    <div class="upload-section">
                        <h4>Front of Vehicle</h4>
                        <div class="upload-area" id="sell-upload-front">
                            <input type="file" id="sell-front-photo" accept="image/*" onchange="handleSellPhotoUpload(event, 'front')">
                            <label for="sell-front-photo" class="upload-label">
                                <i class="fas fa-camera"></i>
                                <span>Take Front Photo</span>
                                <small>Stand directly in front</small>
                            </label>
                            <div class="preview-container" id="sell-preview-front"></div>
                        </div>
                    </div>
                    
                    <!-- Back of Vehicle -->
                    <div class="upload-section">
                        <h4>Back of Vehicle</h4>
                        <div class="upload-area" id="sell-upload-back">
                            <input type="file" id="sell-back-photo" accept="image/*" onchange="handleSellPhotoUpload(event, 'back')">
                            <label for="sell-back-photo" class="upload-label">
                                <i class="fas fa-camera"></i>
                                <span>Take Back Photo</span>
                                <small>Stand directly behind</small>
                            </label>
                            <div class="preview-container" id="sell-preview-back"></div>
                        </div>
                    </div>
                    
                    <!-- Driver Side -->
                    <div class="upload-section">
                        <h4>Driver Side</h4>
                        <div class="upload-area" id="sell-upload-driver">
                            <input type="file" id="sell-driver-photo" accept="image/*" onchange="handleSellPhotoUpload(event, 'driver')">
                            <label for="sell-driver-photo" class="upload-label">
                                <i class="fas fa-camera"></i>
                                <span>Take Driver Side</span>
                                <small>Include entire side view</small>
                            </label>
                            <div class="preview-container" id="sell-preview-driver"></div>
                        </div>
                    </div>
                    
                    <!-- Passenger Side -->
                    <div class="upload-section">
                        <h4>Passenger Side</h4>
                        <div class="upload-area" id="sell-upload-passenger">
                            <input type="file" id="sell-passenger-photo" accept="image/*" onchange="handleSellPhotoUpload(event, 'passenger')">
                            <label for="sell-passenger-photo" class="upload-label">
                                <i class="fas fa-camera"></i>
                                <span>Take Passenger Side</span>
                                <small>Include entire side view</small>
                            </label>
                            <div class="preview-container" id="sell-preview-passenger"></div>
                        </div>
                    </div>
                    
                    <!-- VIN Number -->
                    <div class="upload-section">
                        <h4>VIN Number</h4>
                        <div class="upload-area" id="sell-upload-vin">
                            <input type="file" id="sell-vin-photo" accept="image/*" onchange="handleSellPhotoUpload(event, 'vin')">
                            <label for="sell-vin-photo" class="upload-label">
                                <i class="fas fa-camera"></i>
                                <span>Take VIN Photo</span>
                                <small>Dashboard or door frame</small>
                            </label>
                            <div class="preview-container" id="sell-preview-vin"></div>
                        </div>
                    </div>
                    
                    <!-- Odometer -->
                    <div class="upload-section">
                        <h4>Odometer Reading</h4>
                        <div class="upload-area" id="sell-upload-odometer">
                            <input type="file" id="sell-odometer-photo" accept="image/*" onchange="handleSellPhotoUpload(event, 'odometer')">
                            <label for="sell-odometer-photo" class="upload-label">
                                <i class="fas fa-camera"></i>
                                <span>Take Odometer Photo</span>
                                <small>Show current mileage</small>
                            </label>
                            <div class="preview-container" id="sell-preview-odometer"></div>
                        </div>
                    </div>
                    
                    <!-- Cosmetic Damage -->
                    <div class="upload-section upload-section-wide">
                        <h4>Cosmetic Damage (Optional)</h4>
                        <div class="upload-area" id="sell-upload-damage">
                            <input type="file" id="sell-damage-photo" accept="image/*" multiple onchange="handleSellPhotoUpload(event, 'damage')">
                            <label for="sell-damage-photo" class="upload-label">
                                <i class="fas fa-camera"></i>
                                <span>Upload Damage Photos</span>
                                <small>Any dents, scratches, or damage</small>
                            </label>
                            <div class="preview-container" id="sell-preview-damage"></div>
                        </div>
                    </div>
                </div>
                
                <div class="photo-tips">
                    <h4><i class="fas fa-lightbulb"></i> Photo Tips:</h4>
                    <ul>
                        <li>Take photos in good lighting (daylight is best)</li>
                        <li>Make sure the entire vehicle side is visible in each photo</li>
                        <li>Keep a safe distance to capture the whole vehicle</li>
                        <li>Ensure VIN and odometer photos are clear and readable</li>
                        <li>Include close-up photos of any damage or wear</li>
                    </ul>
                </div>
                
                <div class="sell-vehicle-info">
                    <h3>Step 2: Vehicle Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="sell-vehicle-year">Year</label>
                            <input type="number" id="sell-vehicle-year" min="1900" max="2025" placeholder="e.g., 2020" required>
                        </div>
                        <div class="form-group">
                            <label for="sell-vehicle-make">Make</label>
                            <input type="text" id="sell-vehicle-make" placeholder="e.g., Toyota" required>
                        </div>
                        <div class="form-group">
                            <label for="sell-vehicle-model">Model</label>
                            <input type="text" id="sell-vehicle-model" placeholder="e.g., Camry" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="sell-vehicle-trim">Trim (Optional)</label>
                            <input type="text" id="sell-vehicle-trim" placeholder="e.g., SE, Limited">
                        </div>
                        <div class="form-group">
                            <label for="sell-vehicle-mileage">Current Mileage</label>
                            <input type="number" id="sell-vehicle-mileage" placeholder="e.g., 50000" required>
                        </div>
                    </div>
                </div>
                
                <div class="sell-contact-info">
                    <h3>Step 3: Your Contact Information</h3>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="sell-first-name">First Name</label>
                            <input type="text" id="sell-first-name" required>
                        </div>
                        <div class="form-group">
                            <label for="sell-last-name">Last Name</label>
                            <input type="text" id="sell-last-name" required>
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="sell-email">Email</label>
                            <input type="email" id="sell-email" required>
                        </div>
                        <div class="form-group">
                            <label for="sell-phone">Phone Number</label>
                            <input type="tel" id="sell-phone" required>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="sell-postal">Postal Code</label>
                        <input type="text" id="sell-postal" required>
                    </div>
                </div>
                
                <div class="sell-form-buttons">
                    <button class="btn btn-secondary" onclick="cancelSellForm()">Cancel</button>
                    <button class="btn btn-primary" onclick="submitSellForm()" id="sellSubmitBtn" disabled>Get My Instant Offer</button>
                </div>
            </div>
        </div>
        `;
        
        // Insert the sell form into the hero content
        const heroContent = document.querySelector('.hero-content');
        console.log('Hero content found:', !!heroContent);
        if (heroContent) {
            console.log('Setting innerHTML for sell form');
            heroContent.innerHTML = sellFormHtml;
            heroContent.scrollIntoView({ behavior: 'smooth' });
            console.log('Sell form HTML inserted');
        } else {
            console.error('Hero content not found!');
        }
        
        // Add validation
        validateSellForm();
        
        // Add event listeners for input fields
        const sellFields = ['sell-vehicle-year', 'sell-vehicle-make', 'sell-vehicle-model', 
                           'sell-vehicle-trim', 'sell-vehicle-mileage', 'sell-first-name', 
                           'sell-last-name', 'sell-email', 'sell-phone', 'sell-postal'];
        
        sellFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('input', validateSellForm);
                field.addEventListener('change', validateSellForm);
            }
        });
    } catch (error) {
        console.error('Error in showSellForm:', error);
        alert('Error loading sell form: ' + error.message);
    }
}

// Submit Form
async function submitForm() {
    // Validate all data is collected
    const hasContactInfo = formData.contactInfo &&
        formData.contactInfo.firstName &&
        formData.contactInfo.lastName &&
        formData.contactInfo.email &&
        formData.contactInfo.phone;

    if (formData.vehicleType && formData.budget && formData.tradeIn &&
        formData.creditScore && formData.employment && hasContactInfo) {
        
        try {
            // Create FormData for file uploads
            const submitData = new FormData();
            
            // Prepare application data
            const applicationData = {
                vehicleType: formData.vehicleType,
                budget: formData.budget,
                tradeIn: formData.tradeIn,
                creditScore: formData.creditScore,
                employment: formData.employment,
                incomeType: formData.incomeType,
                annualIncome: formData.annualIncome,
                incomeYears: formData.incomeYears,
                incomeMonths: formData.incomeMonths,
                companyName: formData.companyName,
                jobTitle: formData.jobTitle,
                monthlyIncome: formData.monthlyIncome,
                incomeVerified: formData.incomeVerified,
                firstName: formData.contactInfo.firstName,
                lastName: formData.contactInfo.lastName,
                email: formData.contactInfo.email,
                phone: formData.contactInfo.phone,
                postalCode: formData.contactInfo.postalCode
            };
            
            // Add trade-in details if applicable
            if (formData.tradeIn === 'yes' && formData.tradeInDetails) {
                applicationData.tradeInDetails = formData.tradeInDetails;

                // Add photo files under 'tradeInPhotos' field name
                if (formData.tradeInPhotos) {
                    Object.entries(formData.tradeInPhotos).forEach(([key, file]) => {
                        if (file) {
                            submitData.append('tradeInPhotos', file);
                        }
                    });
                }
            }
            
            // Add application data as JSON string
            submitData.append('applicationData', JSON.stringify(applicationData));
            
            // Add optional document uploads
            if (uploadedDocuments.paystub) {
                submitData.append('paystub', uploadedDocuments.paystub);
            }
            if (uploadedDocuments.licenseFront) {
                submitData.append('driversLicenseFront', uploadedDocuments.licenseFront);
            }
            if (uploadedDocuments.licenseBack) {
                submitData.append('driversLicenseBack', uploadedDocuments.licenseBack);
            }
            
            console.log('Submitting application data:', applicationData);
            
            // Submit to enhanced backend API
            const response = await fetch('/api/applications', {
                method: 'POST',
                body: submitData
            });

            const result = await response.json();
            console.log('Server response:', result);

            if (response.ok && result.success) {
                // Show animated success screen
                showSuccessAnimation(result.applicationId);
            } else {
                console.error('Submission failed:', result);
                alert(`Error: ${result.error || 'Failed to submit application. Please try again.'}`);
            }
        } catch (error) {
            console.error('Error submitting form:', error);
            alert(`Error: ${error.message || 'Failed to submit application. Please check your connection and try again.'}`);
        }
    } else {
        // Show which fields are missing
        let missing = [];
        if (!formData.vehicleType) missing.push('Vehicle Type');
        if (!formData.budget) missing.push('Budget');
        if (!formData.tradeIn) missing.push('Trade-In Selection');
        if (!formData.creditScore) missing.push('Credit Score');
        if (!formData.employment) missing.push('Employment Status');
        if (!hasContactInfo) missing.push('Contact Information');

        alert(`Please complete all required fields: ${missing.join(', ')}`);
    }
}

// Form Navigation Functions
function nextStep() {
    if (currentStep < totalSteps) {
        // Hide current step
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep++;
        // Show next step
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgressBar();
        updateSummary();
    }
}

function prevStep() {
    if (currentStep > 1) {
        // Hide current step
        document.getElementById(`step${currentStep}`).classList.remove('active');
        currentStep--;
        // Show previous step
        document.getElementById(`step${currentStep}`).classList.add('active');
        updateProgressBar();
    }
}

function goToStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    currentStep = step;
    document.getElementById(`step${currentStep}`).classList.add('active');
    updateProgressBar();
}

function updateProgressBar() {
    const progressFill = document.getElementById('progressFill');
    const progressPercent = (currentStep / totalSteps) * 100;
    progressFill.style.width = progressPercent + '%';
    
    // Update progress text
    const remainingMinutes = Math.max(1, 4 - currentStep);
    document.querySelector('.progress-text').textContent = 
        remainingMinutes === 1 ? '1 minute from finish' : `${remainingMinutes} minutes from finish`;
}

function updateSummary() {
    // Update summary for multiple steps
    const summaryElements = document.querySelectorAll('.selection-summary');
    
    summaryElements.forEach(summary => {
        const summaryType = summary.querySelector('.summary-type');
        const summaryBudget = summary.querySelector('.summary-budget');
        const summaryIcon = summary.querySelector('.summary-icon');
        
        if (summaryType && formData.vehicleType) {
            summaryType.textContent = formData.vehicleType.charAt(0).toUpperCase() + formData.vehicleType.slice(1);
        }
        
        if (summaryBudget && formData.budget) {
            const budgetText = {
                'under400': 'Under $400 / Month',
                '400-499': '$400 - 499 / Month',
                '500-600': '$500 - 600 / Month',
                'over600': 'Over $600 / Month'
            };
            summaryBudget.textContent = budgetText[formData.budget] || '';
        }
        
        // Copy the selected vehicle icon to summary
        if (summaryIcon && formData.vehicleType) {
            const selectedVehicle = document.querySelector(`.vehicle-option[data-vehicle="${formData.vehicleType}"]`);
            if (selectedVehicle) {
                const vehicleImg = selectedVehicle.querySelector('img');
                if (vehicleImg) {
                    const imgClone = vehicleImg.cloneNode(true);
                    imgClone.style.filter = 'none'; // Remove grayscale
                    summaryIcon.innerHTML = '';
                    summaryIcon.appendChild(imgClone);
                } else {
                    const iconSvg = selectedVehicle.querySelector('svg');
                    if (iconSvg) {
                        const svgClone = iconSvg.cloneNode(true);
                        summaryIcon.innerHTML = '';
                        summaryIcon.appendChild(svgClone);
                    }
                }
            }
        }
    });
    
    // Update income verification amount
    if (currentStep === 10 && formData.annualIncome) {
        const monthlyIncome = Math.round(formData.annualIncome / 12);
        const incomeDisplay = document.getElementById('calculatedIncome');
        if (incomeDisplay) {
            incomeDisplay.textContent = `$${monthlyIncome.toLocaleString()}`;
        }
    }
}

document.addEventListener('DOMContentLoaded', function() {
    // Vehicle selection
    const vehicleOptions = document.querySelectorAll('.vehicle-option');
    vehicleOptions.forEach(option => {
        option.addEventListener('click', function() {
            // Remove selected class from all options
            vehicleOptions.forEach(opt => opt.classList.remove('selected'));
            // Add selected class to clicked option
            this.classList.add('selected');
            // Store selection
            formData.vehicleType = this.dataset.vehicle;
            // Enable continue button
            document.querySelector('#step1 .form-continue').disabled = false;
            // Auto-advance after brief delay
            setTimeout(() => nextStep(), 350);
        });
    });

    // Budget selection
    const budgetRadios = document.querySelectorAll('input[name="budget"]');
    budgetRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            formData.budget = this.value;
            document.querySelector('#step2 .form-continue').disabled = false;
            // Update visual state
            document.querySelectorAll('#step2 .option-item').forEach(item => {
                if (item.querySelector('input').checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
            // Auto-advance after brief delay
            setTimeout(() => nextStep(), 350);
        });
    });

    // Trade-in selection
    const tradeInRadios = document.querySelectorAll('input[name="tradein"]');
    tradeInRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            formData.tradeIn = this.value;
            document.querySelector('#step3 .form-continue').disabled = false;
            // Update visual state
            document.querySelectorAll('#step3 .option-item').forEach(item => {
                if (item.querySelector('input').checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
            // Auto-advance after brief delay
            setTimeout(() => nextStep(), 350);
        });
    });

    // Credit Score selection
    const creditRadios = document.querySelectorAll('input[name="creditscore"]');
    creditRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            formData.creditScore = this.value;
            document.querySelector('#step4 .form-continue').disabled = false;
            // Update visual state
            document.querySelectorAll('#step4 .option-item').forEach(item => {
                if (item.querySelector('input').checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
            // Auto-advance after brief delay
            setTimeout(() => nextStep(), 350);
        });
    });

    // Employment selection
    const employmentRadios = document.querySelectorAll('input[name="employment"]');
    employmentRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            formData.employment = this.value;
            document.querySelector('#step5 .form-continue').disabled = false;
            // Update visual state
            document.querySelectorAll('#step5 .option-item').forEach(item => {
                if (item.querySelector('input').checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
            // Auto-advance after brief delay
            setTimeout(() => nextStep(), 350);
        });
    });

    // Income type selection
    const incomeTypeRadios = document.querySelectorAll('input[name="incometype"]');
    incomeTypeRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            formData.incomeType = this.value;
            document.querySelector('#step6 .form-continue').disabled = false;
            // Update visual state
            document.querySelectorAll('#step6 .option-item').forEach(item => {
                if (item.querySelector('input').checked) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
            // Auto-advance after brief delay
            setTimeout(() => nextStep(), 350);
        });
    });

    // Annual income input
    const annualIncomeInput = document.getElementById('annualIncome');
    if (annualIncomeInput) {
        annualIncomeInput.addEventListener('input', function() {
            const value = parseInt(this.value);
            if (value > 0) {
                formData.annualIncome = value;
                document.querySelector('#step7 .form-continue').disabled = false;
            } else {
                document.querySelector('#step7 .form-continue').disabled = true;
            }
        });
    }

    // Income duration inputs
    const incomeYearsInput = document.getElementById('incomeYears');
    const incomeMonthsInput = document.getElementById('incomeMonths');
    
    function validateIncomeDuration() {
        const years = parseInt(incomeYearsInput.value) || 0;
        const months = parseInt(incomeMonthsInput.value) || 0;
        
        if (years > 0 || months > 0) {
            formData.incomeDuration.years = years;
            formData.incomeDuration.months = months;
            document.querySelector('#step8 .form-continue').disabled = false;
        } else {
            document.querySelector('#step8 .form-continue').disabled = true;
        }
    }
    
    if (incomeYearsInput) {
        incomeYearsInput.addEventListener('input', validateIncomeDuration);
    }
    if (incomeMonthsInput) {
        incomeMonthsInput.addEventListener('input', validateIncomeDuration);
    }

    // Workplace form validation
    const companyNameInput = document.getElementById('companyName');
    const jobTitleInput = document.getElementById('jobTitle');
    
    function validateWorkplace() {
        const company = companyNameInput.value.trim();
        const jobTitle = jobTitleInput.value.trim();
        
        if (company && jobTitle) {
            formData.workplace.company = company;
            formData.workplace.jobTitle = jobTitle;
            document.querySelector('#step9 .form-continue').disabled = false;
        } else {
            document.querySelector('#step9 .form-continue').disabled = true;
        }
    }
    
    if (companyNameInput) {
        companyNameInput.addEventListener('input', validateWorkplace);
    }
    if (jobTitleInput) {
        jobTitleInput.addEventListener('input', validateWorkplace);
    }

    // Income verification
    const incomeVerifyRadios = document.querySelectorAll('input[name="incomeverify"]');
    incomeVerifyRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            formData.incomeVerified = this.value === 'yes';
            document.querySelector('#step10 .form-continue').disabled = false;
            // Update visual state
            document.querySelectorAll('.verification-option').forEach(option => {
                if (option.querySelector('input').checked) {
                    option.classList.add('selected');
                } else {
                    option.classList.remove('selected');
                }
            });
            // Auto-advance after brief delay
            setTimeout(() => nextStep(), 350);
        });
    });

    // Contact form validation
    const contactInputs = document.querySelectorAll('#step11 input[required]');
    contactInputs.forEach(input => {
        input.addEventListener('input', validateContactForm);
        input.addEventListener('change', validateContactForm);
    });

    function validateContactForm() {
        const firstName = document.getElementById('firstName').value;
        const lastName = document.getElementById('lastName').value;
        const email = document.getElementById('email').value;
        const phone = document.getElementById('phone').value;
        const postalCode = document.getElementById('postalCode').value;
        const consent = document.getElementById('consent').checked;
        
        const isValid = firstName && lastName && email && phone && postalCode && consent;
        document.querySelector('#step11 .form-continue').disabled = !isValid;
        
        if (isValid) {
            formData.contactInfo = {
                firstName,
                lastName,
                email,
                phone,
                postalCode
            };
        }
    }

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMenu = document.getElementById('navMenu');
    const menuOverlay = document.getElementById('menuOverlay');

    function closeMenu() {
        navMenu.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
        if (menuOverlay) menuOverlay.classList.remove('active');

        const spans = mobileMenuToggle.querySelectorAll('span');
        spans[0].style.transform = 'none';
        spans[1].style.opacity = '1';
        spans[2].style.transform = 'none';
    }

    if (mobileMenuToggle && navMenu) {
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('active');
            this.classList.toggle('active');
            if (menuOverlay) menuOverlay.classList.toggle('active');

            // Animate hamburger menu
            const spans = this.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translateY(8px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translateY(-8px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });

        // Close menu when clicking overlay
        if (menuOverlay) {
            menuOverlay.addEventListener('click', closeMenu);
        }
    }

    // Smooth scrolling for anchor links
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetSection = document.querySelector(targetId);
            if (targetSection) {
                const headerOffset = 80;
                const elementPosition = targetSection.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Close mobile menu if open
                closeMenu();
            }
        });
    });

    // Add scroll effect to header
    const header = document.querySelector('.header');
    let lastScrollTop = 0;

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > 100) {
            header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.15)';
        } else {
            header.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        }

        lastScrollTop = scrollTop;
    });

    // Animate elements on scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe content sections
    const contentSections = document.querySelectorAll('.content-section, .vehicle-types, .testimonials');
    contentSections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });

    // Vehicle card hover effects
    const vehicleCards = document.querySelectorAll('.vehicle-card');
    vehicleCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#e8f0fe';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });

    // Form validation (for future forms)
    function validateForm(form) {
        const inputs = form.querySelectorAll('input[required], select[required]');
        let isValid = true;

        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });

        return isValid;
    }

    // Lazy loading images (when real images are added)
    const imageObserverOptions = {
        threshold: 0.01,
        rootMargin: '50px'
    };

    const imageObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.classList.add('loaded');
                    imageObserver.unobserve(img);
                }
            }
        });
    }, imageObserverOptions);

    // Testimonial carousel (basic implementation)
    const testimonials = [
        {
            text: "The process was incredibly easy and straightforward. I got pre-approved in minutes and found my dream car!",
            author: "Sarah M."
        },
        {
            text: "Selling my car to Canada Drives was the best decision. Quick, fair price, and hassle-free!",
            author: "John D."
        },
        {
            text: "Outstanding service from start to finish. The team was professional and helpful throughout.",
            author: "Emily R."
        }
    ];

    let currentTestimonial = 0;
    const testimonialContainer = document.querySelector('.testimonial');
    
    if (testimonialContainer) {
        setInterval(() => {
            currentTestimonial = (currentTestimonial + 1) % testimonials.length;
            const testimonial = testimonials[currentTestimonial];
            
            testimonialContainer.style.opacity = '0';
            setTimeout(() => {
                testimonialContainer.querySelector('p').textContent = `"${testimonial.text}"`;
                testimonialContainer.querySelector('cite').textContent = `- ${testimonial.author}`;
                testimonialContainer.style.opacity = '1';
            }, 300);
        }, 5000);
    }
});

// Handle photo upload for sell form
function handleSellPhotoUpload(event, type) {
    const file = event.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById(`sell-preview-${type}`);
            const uploadArea = document.getElementById(`sell-upload-${type}`);
            
            if (type === 'damage' && event.target.files.length > 1) {
                // Handle multiple damage photos
                previewContainer.innerHTML = '';
                Array.from(event.target.files).forEach((file, index) => {
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        const imgWrapper = document.createElement('div');
                        imgWrapper.style.position = 'relative';
                        imgWrapper.style.display = 'inline-block';
                        imgWrapper.style.margin = '5px';
                        
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        img.className = 'preview-image-small';
                        img.style.width = '80px';
                        img.style.height = '80px';
                        img.style.objectFit = 'cover';
                        img.style.borderRadius = '8px';
                        
                        imgWrapper.appendChild(img);
                        previewContainer.appendChild(imgWrapper);
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                // Single photo preview
                previewContainer.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" class="preview-image">
                    <button class="remove-photo" onclick="removeSellPhoto('${type}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
            
            previewContainer.classList.add('active');
            uploadArea.classList.add('has-image');
            
            // Validate form
            validateSellForm();
        };
        reader.readAsDataURL(file);
    }
}

// Remove photo from sell form
function removeSellPhoto(type) {
    const input = document.getElementById(`sell-${type}-photo`);
    const previewContainer = document.getElementById(`sell-preview-${type}`);
    const uploadArea = document.getElementById(`sell-upload-${type}`);
    
    input.value = '';
    previewContainer.innerHTML = '';
    previewContainer.classList.remove('active');
    uploadArea.classList.remove('has-image');
    
    validateSellForm();
}

// Validate sell form
function validateSellForm() {
    const requiredPhotos = ['front', 'back', 'driver', 'passenger', 'vin', 'odometer'];
    const requiredFields = ['sell-vehicle-year', 'sell-vehicle-make', 'sell-vehicle-model', 
                           'sell-vehicle-mileage', 'sell-first-name', 'sell-last-name', 
                           'sell-email', 'sell-phone', 'sell-postal'];
    
    // Check all required photos
    const photosValid = requiredPhotos.every(type => {
        const input = document.getElementById(`sell-${type}-photo`);
        return input && input.files.length > 0;
    });
    
    // Check all required fields
    const fieldsValid = requiredFields.every(fieldId => {
        const field = document.getElementById(fieldId);
        return field && field.value.trim() !== '';
    });
    
    // Enable/disable submit button
    const submitBtn = document.getElementById('sellSubmitBtn');
    if (submitBtn) {
        submitBtn.disabled = !(photosValid && fieldsValid);
    }
}

// Cancel sell form
function cancelSellForm() {
    // Show the hero content again
    const heroConfidenceSection = document.querySelector('.hero-confidence-section');
    if (heroConfidenceSection) {
        heroConfidenceSection.style.display = 'block';
    }
    
    const choiceButtons = document.querySelector('.hero-choice-buttons');
    if (choiceButtons) {
        choiceButtons.style.display = 'flex';
    }
    
    // Clear the form
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.innerHTML = `
            <div class="hero-buttons-alternative" style="display: none;">
                <a href="#get-approved" class="btn btn-primary">Get Pre-Approved</a>
                <a href="#sell-car" class="btn btn-secondary">Sell My Car</a>
            </div>
        `;
    }
}

// Submit sell form
function submitSellForm() {
    // Collect all form data
    const sellData = {
        photos: {
            front: document.getElementById('sell-front-photo').files[0],
            back: document.getElementById('sell-back-photo').files[0],
            driver: document.getElementById('sell-driver-photo').files[0],
            passenger: document.getElementById('sell-passenger-photo').files[0],
            vin: document.getElementById('sell-vin-photo').files[0],
            odometer: document.getElementById('sell-odometer-photo').files[0],
            damage: document.getElementById('sell-damage-photo').files
        },
        vehicle: {
            year: document.getElementById('sell-vehicle-year').value,
            make: document.getElementById('sell-vehicle-make').value,
            model: document.getElementById('sell-vehicle-model').value,
            trim: document.getElementById('sell-vehicle-trim').value,
            mileage: document.getElementById('sell-vehicle-mileage').value
        },
        contact: {
            firstName: document.getElementById('sell-first-name').value,
            lastName: document.getElementById('sell-last-name').value,
            email: document.getElementById('sell-email').value,
            phone: document.getElementById('sell-phone').value,
            postal: document.getElementById('sell-postal').value
        }
    };
    
    // Show success message
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        heroContent.innerHTML = `
            <div class="submission-success">
                <i class="fas fa-check-circle"></i>
                <h2>Thank You!</h2>
                <p>We've received your vehicle information and photos.</p>
                <p>You'll receive your instant offer via email within the next few minutes.</p>
                <button class="btn btn-primary" onclick="location.reload()">Return to Home</button>
            </div>
        `;
        heroContent.scrollIntoView({ behavior: 'smooth' });
    }
    
    console.log('Sell form submitted:', sellData);
}

// Make functions globally accessible
window.showPreApprovalForm = showPreApprovalForm;
window.showSellForm = showSellForm;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.goToStep = goToStep;
window.submitForm = submitForm;
window.validateAndContinueTradeIn = validateAndContinueTradeIn;
window.handleSellPhotoUpload = handleSellPhotoUpload;
window.removeSellPhoto = removeSellPhoto;
window.validateSellForm = validateSellForm;
window.cancelSellForm = cancelSellForm;
window.submitSellForm = submitSellForm;
window.handlePhotoUpload = handlePhotoUpload;
window.removePhoto = removePhoto;

// Photo Upload Functions
function handlePhotoUpload(event, type) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
    }
    
    // Create preview
    const reader = new FileReader();
    reader.onload = function(e) {
        const uploadArea = document.getElementById(`upload-${type}`);
        const previewContainer = document.getElementById(`preview-${type}`);
        const uploadLabel = uploadArea.querySelector('.upload-label');
        
        // Hide upload label
        uploadLabel.style.display = 'none';
        
        // Create preview elements
        previewContainer.innerHTML = `
            <img src="${e.target.result}" class="preview-image" alt="${type} preview">
            <button type="button" class="remove-photo" onclick="removePhoto('${type}')">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Show preview
        previewContainer.classList.add('active');
        uploadArea.classList.add('has-image');
        
        // Store file data
        if (type === 'damage') {
            formData.tradeInDetails.photos.damage.push(file);
        } else {
            formData.tradeInDetails.photos[type] = file;
        }
        
        // Check if all required photos are uploaded
        validateTradeInPhotos();
    };
    
    reader.readAsDataURL(file);
}

function removePhoto(type) {
    const uploadArea = document.getElementById(`upload-${type}`);
    const previewContainer = document.getElementById(`preview-${type}`);
    const uploadLabel = uploadArea.querySelector('.upload-label');
    const fileInput = uploadArea.querySelector('input[type="file"]');
    
    // Reset file input
    fileInput.value = '';
    
    // Clear preview
    previewContainer.innerHTML = '';
    previewContainer.classList.remove('active');
    uploadArea.classList.remove('has-image');
    
    // Show upload label
    uploadLabel.style.display = 'flex';
    
    // Remove from stored data
    if (type === 'damage') {
        formData.tradeInDetails.photos.damage = [];
    } else {
        formData.tradeInDetails.photos[type] = null;
    }
    
    // Re-validate
    validateTradeInPhotos();
}

function validateTradeInPhotos() {
    const requiredPhotos = ['front', 'driver', 'passenger', 'vin', 'odometer'];
    const allPhotosUploaded = requiredPhotos.every(type => formData.tradeInDetails.photos[type] !== null);
    
    // Also check if vehicle info is filled
    const vehicleInfoFilled = 
        document.getElementById('vehicle-year').value &&
        document.getElementById('vehicle-make').value &&
        document.getElementById('vehicle-model').value &&
        document.getElementById('vehicle-mileage').value &&
        document.getElementById('vehicle-condition').value;
    
    // Enable/disable continue button
    const continueBtn = document.querySelector('#step3-tradein .form-continue');
    if (continueBtn) {
        continueBtn.disabled = !(allPhotosUploaded && vehicleInfoFilled);
    }
}

function validateAndContinueTradeIn() {
    // Store vehicle info
    formData.tradeInDetails.info = {
        year: document.getElementById('vehicle-year').value,
        make: document.getElementById('vehicle-make').value,
        model: document.getElementById('vehicle-model').value,
        mileage: document.getElementById('vehicle-mileage').value,
        condition: document.getElementById('vehicle-condition').value
    };
    
    // Continue to next step
    nextStep();
}

// Add event listeners for trade-in form fields
document.addEventListener('DOMContentLoaded', function() {
    // Trade-in vehicle info validation
    const tradeInFields = ['vehicle-year', 'vehicle-make', 'vehicle-model', 'vehicle-mileage', 'vehicle-condition'];
    tradeInFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', validateTradeInPhotos);
            field.addEventListener('change', validateTradeInPhotos);
        }
    });
});

// Document upload handling
let uploadedDocuments = {
    paystub: null,
    licenseFront: null,
    licenseBack: null
};

window.handleDocumentUpload = function(type, input) {
    const file = input.files[0];
    if (!file) return;
    
    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        input.value = '';
        return;
    }
    
    // Store the file
    uploadedDocuments[type] = file;
    
    // Update UI
    const uploadArea = document.getElementById(`${type}UploadArea`);
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    const preview = uploadArea.querySelector('.upload-preview');
    const fileName = preview.querySelector('.file-name');
    
    // Show preview
    placeholder.style.display = 'none';
    preview.style.display = 'flex';
    fileName.textContent = file.name;
}

window.removeDocumentFile = function(type) {
    // Clear the file
    uploadedDocuments[type] = null;
    
    // Reset input
    const input = document.getElementById(`${type}File`);
    input.value = '';
    
    // Update UI
    const uploadArea = document.getElementById(`${type}UploadArea`);
    const placeholder = uploadArea.querySelector('.upload-placeholder');
    const preview = uploadArea.querySelector('.upload-preview');
    
    // Show placeholder
    placeholder.style.display = 'block';
    preview.style.display = 'none';
}

// Success Animation Function
function showSuccessAnimation(applicationId) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'success-overlay';
    overlay.innerHTML = `
        <div class="success-content">
            <div class="checkmark-circle">
                <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                    <circle class="checkmark-circle-bg" cx="26" cy="26" r="25" fill="none"/>
                    <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                </svg>
            </div>
            <h2 class="success-title">Congratulations!</h2>
            <p class="success-message">Your pre-approval application has been submitted successfully.</p>
            <p class="success-submessage">You will be receiving a call shortly!</p>
            <div class="success-app-id">Application ID: <strong>${applicationId}</strong></div>
            <button class="btn btn-primary success-btn" onclick="closeSuccessAndReset()">Back to Home</button>
        </div>
    `;

    document.body.appendChild(overlay);

    // Trigger animation
    setTimeout(() => {
        overlay.classList.add('active');
    }, 10);
}

// Close success overlay and reset form
function closeSuccessAndReset() {
    const overlay = document.querySelector('.success-overlay');
    if (overlay) {
        overlay.classList.remove('active');
        setTimeout(() => {
            overlay.remove();

            // Reset form and go back to hero
            currentStep = 1;
            document.querySelector('.hero-banner').style.display = 'block';
            document.querySelector('.hero-confidence-section').style.display = 'block';
            document.getElementById('formWizard').style.display = 'none';

            // Smooth scroll to the confidence section
            const confidenceSection = document.getElementById('get-approved');
            if (confidenceSection) {
                setTimeout(() => {
                    confidenceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
            }

            // Reset form data
            formData = {
                vehicleType: '',
                budget: '',
                tradeIn: '',
                creditScore: '',
                employment: '',
                contactInfo: {}
            };

            // Reset form UI
            document.querySelectorAll('.form-step').forEach(step => step.classList.remove('active'));
            document.getElementById('step1').classList.add('active');
            document.querySelectorAll('input[type="radio"]').forEach(radio => radio.checked = false);
            document.querySelectorAll('.option-item').forEach(item => item.classList.remove('selected'));
            document.querySelectorAll('.vehicle-option').forEach(option => option.classList.remove('selected'));
            document.getElementById('step6').querySelectorAll('input').forEach(input => input.value = '');
            document.getElementById('consent').checked = false;

            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 300);
    }
}
// ====== SCROLL ANIMATIONS ======
// Initialize scroll animations for sections
document.addEventListener('DOMContentLoaded', function() {
    // Add animation classes to sections
    const animatedSections = [
        '.hero-confidence-section',
        '.content-section',
        '.our-story',
        '.vehicle-types',
        '.testimonials'
    ];

    // Add animate-on-scroll class to sections
    animatedSections.forEach(selector => {
        const sections = document.querySelectorAll(selector);
        sections.forEach(section => {
            section.classList.add('animate-on-scroll');
        });
    });

    // Add stagger-children to grids
    const staggerContainers = [
        '.testimonial-carousel',
        '.vehicle-grid',
        '.location-highlights',
        '.achievements'
    ];

    staggerContainers.forEach(selector => {
        const containers = document.querySelectorAll(selector);
        containers.forEach(container => {
            container.classList.add('stagger-children');
        });
    });

    // Create Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -100px 0px',
        threshold: 0.1
    };

    const scrollObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Don't unobserve to allow re-animation if desired
            }
        });
    }, observerOptions);

    // Observe all animated elements
    document.querySelectorAll('.animate-on-scroll, .stagger-children').forEach(el => {
        scrollObserver.observe(el);
    });

    // Parallax effect for hero background
    const hero = document.querySelector('.hero');
    if (hero) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            hero.style.backgroundPositionY = `calc(center + ${rate}px)`;
        }, { passive: true });
    }

    // Smooth reveal for form wizard
    const formWizard = document.querySelector('.form-wizard');
    if (formWizard) {
        formWizard.style.opacity = '0';
        formWizard.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            formWizard.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
            formWizard.style.opacity = '1';
            formWizard.style.transform = 'translateY(0)';
        }, 200);
    }

    // Add hover effect enhancement to vehicle cards
    const vehicleCards = document.querySelectorAll('.vehicle-card');
    vehicleCards.forEach((card, index) => {
        card.style.animationDelay = `${index * 0.1}s`;
    });

    console.log('Scroll animations initialized');
});
