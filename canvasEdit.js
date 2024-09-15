const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const upload = document.getElementById('upload');
const textInput = document.getElementById('textInput');
const writeTextButton = document.getElementById('writeText');
const saveImageButton = document.getElementById('saveImage');

let img = new Image();
let imageLoaded = false;

// Handle file upload
upload.addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    }
});

// Draw image on canvas when loaded
img.onload = function() {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    imageLoaded = true;
};

// Write text on canvas
writeTextButton.addEventListener('click', function() {
    if (!imageLoaded) {
        alert('Please upload an image first.');
        return;
    }

    const text = textInput.value;
    if (text) {
        ctx.font = '36px Arial';
        ctx.fillStyle = 'red';
        ctx.textAlign = 'center';
        ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    } else {
        alert('Please enter some text.');
    }
});

// Save edited image
saveImageButton.addEventListener('click', function() {
    if (!imageLoaded) {
        alert('Please upload an image first.');
        return;
    }

    const editedImage = canvas.toDataURL('image/jpeg');
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = 'edited-image.jpg';
    link.click();
});
