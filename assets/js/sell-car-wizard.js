// Sell Car Wizard functionality
let currentSellStep = 1;
const totalSellSteps = 7;
let sellFormData = {
    year: '',
    make: '',
    model: '',
    mileage: '',
    mileageUnit: 'km',
    condition: '',
    photos: {},
    contact: {}
};

// Photo upload handling for sell wizard
function handleSellWizardPhotoUpload(event, type) {
    const file = event.target.files[0];
    if (file) {
        // Store the file
        sellFormData.photos[type] = file;
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            const previewContainer = document.getElementById(`sell-wizard-preview-${type}`);
            if (previewContainer) {
                previewContainer.innerHTML = `
                    <img src="${e.target.result}" alt="${type} photo">
                    <button class="remove-photo" onclick="removeSellWizardPhoto('${type}')">
                        <i class="fas fa-times"></i>
                    </button>
                `;
            }
        };
        reader.readAsDataURL(file);
        
        // Check if all photos are uploaded for step 6
        if (currentSellStep === 6) {
            checkSellPhotoCompletion();
        }
    }
}

function removeSellWizardPhoto(type) {
    delete sellFormData.photos[type];
    const input = document.getElementById(`sell-wizard-${type}-photo`);
    if (input) input.value = '';
    const preview = document.getElementById(`sell-wizard-preview-${type}`);
    if (preview) preview.innerHTML = '';
    
    if (currentSellStep === 6) {
        checkSellPhotoCompletion();
    }
}

function checkSellPhotoCompletion() {
    const requiredPhotos = ['front', 'back', 'driver', 'passenger', 'vin', 'odometer'];
    const allPhotosUploaded = requiredPhotos.every(type => sellFormData.photos[type]);
    
    const continueBtn = document.querySelector('.wizard-nav .btn-primary');
    if (continueBtn) {
        if (allPhotosUploaded) {
            continueBtn.disabled = false;
            continueBtn.textContent = 'Continue';
        } else {
            continueBtn.disabled = true;
            continueBtn.textContent = 'Upload All Required Photos';
        }
    }
}

function showSellStep(step) {
    // Hide all steps
    document.querySelectorAll('.wizard-step').forEach(s => s.style.display = 'none');
    
    // Show current step
    const currentStepElement = document.getElementById(`sell-step-${step}`);
    if (currentStepElement) {
        currentStepElement.style.display = 'block';
    }
    
    // Update progress
    updateSellProgress(step);
    
    // Update navigation
    updateSellNavigation(step);
    
    // Scroll to top
    window.scrollTo(0, 100);
}

function updateSellProgress(step) {
    const progress = (step / totalSellSteps) * 100;
    const progressBar = document.querySelector('.progress-fill');
    if (progressBar) {
        progressBar.style.width = `${progress}%`;
    }
    
    // Update step indicators
    document.querySelectorAll('.step-indicator').forEach((indicator, index) => {
        if (index < step) {
            indicator.classList.add('completed');
            indicator.classList.remove('active');
        } else if (index === step - 1) {
            indicator.classList.add('active');
            indicator.classList.remove('completed');
        } else {
            indicator.classList.remove('active', 'completed');
        }
    });
}

function updateSellNavigation(step) {
    const prevBtn = document.getElementById('sell-prev-btn');
    const nextBtn = document.getElementById('sell-next-btn');
    const submitBtn = document.getElementById('sell-submit-btn');
    
    if (prevBtn) prevBtn.style.display = step === 1 ? 'none' : 'inline-block';
    
    if (step === totalSellSteps) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'inline-block';
    } else {
        if (nextBtn) nextBtn.style.display = 'inline-block';
        if (submitBtn) submitBtn.style.display = 'none';
    }
    
    // Special handling for photo step
    if (step === 6) {
        checkSellPhotoCompletion();
    }
}

function nextSellStep() {
    if (validateCurrentSellStep()) {
        currentSellStep++;
        showSellStep(currentSellStep);
    }
}

function prevSellStep() {
    currentSellStep--;
    showSellStep(currentSellStep);
}

function validateCurrentSellStep() {
    switch(currentSellStep) {
        case 1: // Year
            const year = document.getElementById('sell-year').value;
            if (!year) {
                alert('Please select the year of your vehicle');
                return false;
            }
            sellFormData.year = year;
            return true;
            
        case 2: // Make
            const make = document.getElementById('sell-make').value;
            if (!make) {
                alert('Please select the make of your vehicle');
                return false;
            }
            sellFormData.make = make;
            return true;
            
        case 3: // Model
            const model = document.getElementById('sell-model').value.trim();
            if (!model) {
                alert('Please enter the model of your vehicle');
                return false;
            }
            sellFormData.model = model;
            return true;
            
        case 4: // Mileage
            const mileage = document.getElementById('sell-mileage').value;
            const unit = document.querySelector('input[name="mileage-unit"]:checked').value;
            if (!mileage || mileage < 0) {
                alert('Please enter valid mileage');
                return false;
            }
            sellFormData.mileage = parseInt(mileage);
            sellFormData.mileageUnit = unit;
            return true;
            
        case 5: // Condition
            const condition = document.querySelector('input[name="vehicle-condition"]:checked');
            if (!condition) {
                alert('Please select your vehicle condition');
                return false;
            }
            sellFormData.condition = condition.value;
            return true;
            
        case 6: // Photos
            const requiredPhotos = ['front', 'back', 'driver', 'passenger', 'vin', 'odometer'];
            const allPhotosUploaded = requiredPhotos.every(type => sellFormData.photos[type]);
            if (!allPhotosUploaded) {
                alert('Please upload all required photos');
                return false;
            }
            return true;
            
        case 7: // Contact Info
            // Validation will happen on submit
            return true;
            
        default:
            return true;
    }
}

async function submitSellForm() {
    // Validate contact information
    const firstName = document.getElementById('sell-contact-first').value.trim();
    const lastName = document.getElementById('sell-contact-last').value.trim();
    const email = document.getElementById('sell-contact-email').value.trim();
    const phone = document.getElementById('sell-contact-phone').value.trim();
    const postalCode = document.getElementById('sell-contact-postal').value.trim();
    
    if (!firstName || !lastName || !email || !phone || !postalCode) {
        alert('Please fill in all contact information');
        return;
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return;
    }
    
    // Phone validation
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;
    if (!phoneRegex.test(phone) || phone.length < 10) {
        alert('Please enter a valid phone number');
        return;
    }
    
    // Postal code validation (Canadian format)
    const postalRegex = /^[A-Za-z]\d[A-Za-z]\s?\d[A-Za-z]\d$/;
    if (!postalRegex.test(postalCode)) {
        alert('Please enter a valid postal code (e.g., K1A 0B1)');
        return;
    }
    
    // Store contact info
    sellFormData.contact = {
        firstName,
        lastName,
        email,
        phone,
        postalCode
    };
    
    // Create FormData for submission
    const formData = new FormData();
    
    // Add photos
    Object.entries(sellFormData.photos).forEach(([type, file]) => {
        formData.append(`${type}Photo`, file);
    });
    
    // Add form data
    const sellData = {
        year: sellFormData.year,
        make: sellFormData.make,
        model: sellFormData.model,
        mileage: sellFormData.mileage,
        mileageUnit: sellFormData.mileageUnit,
        condition: sellFormData.condition,
        contact: sellFormData.contact
    };
    
    formData.append('sellData', JSON.stringify(sellData));
    
    // Show loading state
    const submitBtn = document.getElementById('sell-submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
    
    try {
        const response = await fetch('/api/sell-car', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show success message
            showSellSuccess();
        } else {
            throw new Error(result.error || 'Submission failed');
        }
    } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error submitting your request. Please try again.');
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function showSellSuccess() {
    const wizardContent = document.querySelector('.sell-wizard-content');
    if (wizardContent) {
        wizardContent.innerHTML = `
            <div class="submission-success" style="text-align: center; padding: 60px 20px;">
                <i class="fas fa-check-circle" style="font-size: 5rem; color: var(--green-primary); margin-bottom: 2rem;"></i>
                <h2 style="font-size: 2.5rem; margin-bottom: 1rem;">Thank You!</h2>
                <p style="font-size: 1.25rem; margin-bottom: 1rem;">We've received your vehicle information and photos.</p>
                <p style="font-size: 1.25rem; margin-bottom: 3rem;">You'll receive your instant offer via email within the next few minutes.</p>
                <a href="index.html" class="btn btn-primary btn-lg">Return to Home</a>
            </div>
        `;
        window.scrollTo(0, 0);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Show first step
    showSellStep(1);
    
    // Attach global functions
    window.handleSellWizardPhotoUpload = handleSellWizardPhotoUpload;
    window.removeSellWizardPhoto = removeSellWizardPhoto;
    window.nextSellStep = nextSellStep;
    window.prevSellStep = prevSellStep;
    window.submitSellForm = submitSellForm;
});