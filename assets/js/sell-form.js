// Simple Sell Form Implementation
function showSellForm() {
    console.log('showSellForm called');
    
    // Hide other sections
    const heroConfidenceSection = document.querySelector('.hero-confidence-section');
    if (heroConfidenceSection) {
        heroConfidenceSection.style.display = 'none';
    }
    
    const choiceButtons = document.querySelector('.hero-choice-buttons');
    if (choiceButtons) {
        choiceButtons.style.display = 'none';
    }
    
    const formWizard = document.getElementById('formWizard');
    if (formWizard) {
        formWizard.style.display = 'none';
    }
    
    // Get or create sell car wizard
    let sellCarWizard = document.getElementById('sellCarWizard');
    if (!sellCarWizard) {
        console.log('Creating sell car wizard element');
        sellCarWizard = document.createElement('div');
        sellCarWizard.id = 'sellCarWizard';
        sellCarWizard.className = 'sell-car-wizard';
        const heroContent = document.querySelector('.hero-content');
        if (heroContent) {
            heroContent.appendChild(sellCarWizard);
        }
    }
    
    // Create the sell form HTML
    sellCarWizard.innerHTML = `
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
    `;
    
    // Show the sell car wizard
    sellCarWizard.style.display = 'block';
    sellCarWizard.scrollIntoView({ behavior: 'smooth' });
    
    console.log('Sell form displayed');
}

// Handle photo upload
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
        };
        reader.readAsDataURL(file);
    }
}

// Remove photo
function removeSellPhoto(type) {
    const input = document.getElementById(`sell-${type}-photo`);
    const previewContainer = document.getElementById(`sell-preview-${type}`);
    const uploadArea = document.getElementById(`sell-upload-${type}`);
    
    input.value = '';
    previewContainer.innerHTML = '';
    previewContainer.classList.remove('active');
    uploadArea.classList.remove('has-image');
}

// Cancel sell form
function cancelSellForm() {
    const sellCarWizard = document.getElementById('sellCarWizard');
    if (sellCarWizard) {
        sellCarWizard.style.display = 'none';
        sellCarWizard.innerHTML = '';
    }
    
    // Show the hero content again
    const heroConfidenceSection = document.querySelector('.hero-confidence-section');
    if (heroConfidenceSection) {
        heroConfidenceSection.style.display = 'block';
    }
    
    const choiceButtons = document.querySelector('.hero-choice-buttons');
    if (choiceButtons) {
        choiceButtons.style.display = 'flex';
    }
}

// Submit sell form
function submitSellForm() {
    const sellCarWizard = document.getElementById('sellCarWizard');
    if (sellCarWizard) {
        sellCarWizard.innerHTML = `
            <div class="submission-success">
                <i class="fas fa-check-circle"></i>
                <h2>Thank You!</h2>
                <p>We've received your vehicle information and photos.</p>
                <p>You'll receive your instant offer via email within the next few minutes.</p>
                <button class="btn btn-primary" onclick="location.reload()">Return to Home</button>
            </div>
        `;
        sellCarWizard.scrollIntoView({ behavior: 'smooth' });
    }
}

// Make functions globally accessible
window.showSellForm = showSellForm;
window.handleSellPhotoUpload = handleSellPhotoUpload;
window.removeSellPhoto = removeSellPhoto;
window.cancelSellForm = cancelSellForm;
window.submitSellForm = submitSellForm;