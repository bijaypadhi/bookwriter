"use strict";
import {
    zoom
} from './directive.js';
import * as CONSTANTS from './constants.js';
import { userId } from './home.js';
import {
    findGetParameter,
    stringToBoolean,
    fetchLanguages,
    infoToPageURL,
    infoToImageURL,
    assertsTitleExists,
    chooseLanguage,
    fetchLanguage,
    fetchLibrary,
    fetchBook,
    fetchVolume
} from './tools.js';
import {
    setCookie,
    getCookie,
    getPosCookie,
    setPosCookie
} from './cookie.js';

let canvas, colorCanvas;
let position = null;

function getImage(url, retries = 3, delay = 500) {
    return new Promise(function(resolve, reject) {
        const img = new Image();
        const cacheBuster = `?nocache=${Date.now()}-${Math.random()}`;
        img.src = url + cacheBuster; // Ensure fresh load

        img.onload = function() {
            resolve(img.src);
        };

        img.onerror = function() {
            if (retries > 0) {
                setTimeout(() => {
                    getImage(url, retries - 1, delay).then(resolve).catch(reject);
                }, delay);
            } else {
                reject(new Error(`Failed to load image: ${url}`));
            }
        };
    });
}

if (!userId) {
	alert("No user Id Do something");
   userId="5ccl8yOZicftkSQyzrHhtL0HhFD3"; // Ensure no extra underscore and format is correct
}
function refreshLayoutNavImage() {
    const margin = UCONFIG.pageWidthSlider / 100;
    const availableScreenWidth = window.innerWidth * margin;
    let horizontalLayoutHeight = (margin * window.innerHeight) * imgPageLeft.naturalWidth / imgPageLeft.naturalHeight;
    let verticalLayoutWidthCSS = (margin * 100).toString() + "vw";
    const horizontalLayoutHeightCSS = (margin * 100).toString() + "vh";
    if (UCONFIG.doublePage) {
        horizontalLayoutHeight *= 2;
        verticalLayoutWidthCSS = (margin * 100 / 2).toString() + "vw";
    }
    if (availableScreenWidth < horizontalLayoutHeight) {
        // Vertical Layout
        imgPageLeft.style.height = null;
        imgPageRight.style.height = null;
        imgPageLeft.style.width = verticalLayoutWidthCSS;
        imgPageRight.style.width = verticalLayoutWidthCSS;
    } else {
        // Horizontal Layout
        imgPageLeft.style.height = horizontalLayoutHeightCSS;
        imgPageRight.style.height = horizontalLayoutHeightCSS;
        imgPageLeft.style.width = null;
        imgPageRight.style.width = null;
    }
    refreshSidePages();
}

function toggleNavMenu() {
    if (IS_BAR_VISIBLE) {
        document.getElementById("topMenu").classList.add("hidden");
        document.getElementById("bottomMenu").classList.add("hidden");
    } else {
        document.getElementById("topMenu").classList.remove("hidden");
        document.getElementById("bottomMenu").classList.remove("hidden");

    }
    IS_BAR_VISIBLE = !IS_BAR_VISIBLE
}
$('.slider img').on('click', function() {

    const selectedImageSrc = $(this).attr('src'); // Get the selected image source
    handleImageSelection(selectedImageSrc); // Call the function to handle the selected image
});

function handleImageSelection(src) {
    if (src.includes('text')) {
        applyEditor(src);
    } else {
        destroyQuill(position);
        applyTemplate(src);
    }
	
}


let quillLeft, quillRight;
let editorContainer;
let lastPosition = { left: 160, top: 158 };

function initializeQuill(position, canvasWidth, canvasHeight) {
    const imgPageLeft = document.getElementById("imgPageLeft");
    const imgPageLeftRect = imgPageLeft.getBoundingClientRect();
    let isContentLimited = false;
    const maxHeight = 278;
    
    lastPosition = {
        left: 336, // Use the left position of imgPageLeft
        top: 90    // Use the top position of imgPageLeft
    };
    
    const quillWidth = canvasWidth / 2;
    const quillHeight = canvasHeight / 2;
    
    const Font = Quill.import('formats/font');
    Font.whitelist = ['mirza', 'roboto'];
    Quill.register(Font, true);

    if (!editorContainer) {
        editorContainer = document.createElement('div');
        editorContainer.id = 'editorContainer';
        editorContainer.style.position = 'absolute';
        editorContainer.style.left = `${lastPosition.left}px`;
        editorContainer.style.top = `${lastPosition.top}px`;
        editorContainer.style.width = '300px';
        editorContainer.style.height = '300px';
        editorContainer.style.backgroundColor = 'transparent'; // Make container transparent
        editorContainer.style.border = '1px solid #ccc'; // Add border for better visibility
        editorContainer.style.zIndex = '1000';
        editorContainer.style.resize = 'both'; // Make the container resizable
        editorContainer.style.overflow = 'visible'; // Prevent excessive content overflow

        makeDraggable(editorContainer);
        document.body.appendChild(editorContainer);
    }

    const quillDiv = document.createElement('div');
    quillDiv.id = position === 'left' ? 'quillLeft' : 'quillRight';
    quillDiv.style.position = 'absolute';
    quillDiv.style.left = '10px'; 
    quillDiv.style.top = '10px';
    quillDiv.style.width = `calc(100% - 20px)`;
    quillDiv.style.height = `calc(100% - 20px)`;
    quillDiv.style.zIndex = '1002';
    quillDiv.style.overflow = 'visible'; // Prevent scrollbars

    quillDiv.setAttribute('spellcheck', 'true');
    editorContainer.appendChild(quillDiv);

    // Initialize Quill editor
    const quill = new Quill(`#${quillDiv.id}`, {
        placeholder: 'Type your text here...',
        theme: 'bubble',
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                [{ 'color': [] }, { 'background': [] }]
            ],
            imageResize: {
                modules: ['Resize', 'DisplaySize', 'Toolbar']
            }
        }
    });
   
const quillEditor = editorContainer.querySelector('.ql-editor');
quillEditor.style.overflowY = 'hidden';

    quill.on('editor-change', () => {
        const delta = quill.getContents();
        if (delta.ops.length === 0 || delta.ops[0].insert === '\n') {
            quill.format('color', 'black');
        }
    });

    editorContainer.addEventListener('click', () => {
        quill.focus();
    });

    quill.on('text-change', function (delta, oldDelta, source) {
        if (quill.getLength() === 1) { // Only newline exists
            quill.root.dataset.placeholder = "Type your text here...";
        }

        animateActiveLine(quill);

        // Get the actual content height
        const editorContent = quill.root;
        if (editorContent.scrollHeight > maxHeight) {
            quill.disable(); // Disable editing when content exceeds max height

            if (!isContentLimited) {
                editorContent.style.boxShadow = '0 0 8px rgba(255,0,0,0.3)';
                setTimeout(() => {
                    editorContent.style.boxShadow = '';
                }, 1000);
                isContentLimited = true;
            }
        } else {
            if (isContentLimited) {
                quill.enable(); // Re-enable if within limit
                isContentLimited = false;
            }
        }
    });

    // Store reference to the Quill instance
    if (position === 'left') {
        quillLeft = quill;
    } else {
        quillRight = quill;
    }

    // Initialize speech recognition if needed
    toggleSpeechRecognition(quill);
}

function removeQuill() {
    if (editorContainer) {
        document.body.removeChild(editorContainer); // Remove the entire container
        editorContainer = null; // Clear the reference
        console.log("Editor container removed successfully.");
    }
}


function destroyQuill(position) {
    if (position === 'left' && quillLeft) {
        quillLeft.enable(false); // Disable the editor
        removeQuill(); // Call the function to remove the quillLeft div
        quillLeft = null; // Clear reference
    } else if (position === 'right' && quillRight) {
        quillRight.enable(false);
        removeQuill(); // Disable the editor
        const quillRightDiv = document.getElementById('quillRight');
        if (quillRightDiv) {
            quillRightDiv.parentNode.removeChild(quillRightDiv); // Remove from DOM
        }
        quillRight = null; // Clear reference
    }

    // Remove the toolbar if it exists
    const toolbar = document.querySelector('.ql-toolbar');
    if (toolbar) {
        toolbar.parentNode.removeChild(toolbar); // Remove the toolbar from the DOM
    }
}

let previousLine = null;

function animateActiveLine(quill) {
   quill.on("selection-change", function (range) {
    if (range) {
        document.querySelectorAll(".ql-editor p, .ql-editor div").forEach((el) => {
            el.classList.remove("active-line");
        });

        let [block] = quill.getLeaf(range.index);
        if (block) {
            let line = block.domNode.parentNode;
            line.classList.add("active-line");

            // Remove effect after 1 second
            setTimeout(() => {
                line.classList.remove("active-line");
            }, 1000);
        }
    }
});

// CSS Animation
const style = document.createElement("style");
style.innerHTML = `
    .active-line {
        transition: background 0.5s ease-in-out;
        background: rgba(255, 215, 0, 0.2);
        box-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
    }
`;
document.head.appendChild(style);
}

function createEditorOverlay(targetId, position, canvasWidth, canvasHeight) {
    const targetElement = document.getElementById(targetId);
    const rect = targetElement.getBoundingClientRect();

    // Create the overlay div
    const overlayDiv = document.createElement('div');
    overlayDiv.style.position = 'absolute';
    overlayDiv.style.left = `${rect.left}px`;
    overlayDiv.style.top = `${rect.top}px`;
    overlayDiv.style.width = `${canvasWidth}px`;
    overlayDiv.style.height = `${canvasHeight}px`;
    overlayDiv.style.zIndex = '10';
    overlayDiv.style.backgroundColor = 'rgba(255, 255, 255, 0.5)'; // Semi-transparent background
    overlayDiv.style.display = 'flex';
    overlayDiv.style.justifyContent = 'center';
    overlayDiv.style.alignItems = 'center';
    overlayDiv.style.cursor = 'pointer';
    overlayDiv.innerHTML = `<span style="font-size: 18px; color: #333;">Click to start writing</span>`;

    // Append the overlay to the document body
     document.body.appendChild(overlayDiv);

    // Add a click event listener to initialize the editor
    overlayDiv.addEventListener('click', () => {
        // Remove the overlay
        overlayDiv.remove();

        // Initialize the Quill editor
        initializeQuill(position, canvasWidth, canvasHeight);

        // Enable or disable editors based on position
        if (position === 'left') {
            quillLeft.enable();
            if (quillRight) quillRight.enable(false);
        } else {
            quillRight.enable();
            if (quillLeft) quillLeft.enable(false);
        }
    });
}
// Add an event listener for text changes


function applyTemplate(src) {
    const imgElement = document.getElementById("imgPageLeft");
    const imgPageElement = document.getElementById("imgPageRight");
    const urlParams = new URLSearchParams(window.location.search);
    const fileNumber = parseInt(urlParams.get('page'));
    
    if (isNaN(fileNumber)) {
        alert("Could not extract a valid file number from the URL.");
        return;
    }

  

    if (fileNumber % 2 === 1) { // even number
        imgElement.src = src;

        position = 'right';
      
      
    } else { // Even number
            imgPageElement.src = src;
            const canvasWidth = imgPageElement.width;
            const canvasHeight = imgPageElement.height;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            ctx.drawImage(imgPageElement, 0, 0);

            const imageData = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
            const rgbaColor = `rgba(${imageData[0]}, ${imageData[1]}, ${imageData[2]}, ${imageData[3] / 255})`;

            const colorCanvas = document.createElement('canvas');
            const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
           
            // Set your original image dimensions
            colorCanvas.width = imgElement.width;
            colorCanvas.height = imgElement.height;

            const marginSize = 40; // Adjust this value to change the thickness of the margins
            const decorationWidth = marginSize * 2; // Width for the decorations

            // Calculate the top and bottom positions for drawing
            const topPosition = marginSize; // Start drawing after the top margin
            const bottomPosition = colorCanvas.height - marginSize; // Stop drawing before the bottom margin

            // Fill the canvas with the specified color, leaving margins at the top and bottom
			if (rgbaColor === 'rgba(0, 0, 0, 0)') {
              rgbaColor = 'rgba(173, 216, 230, 1)';  // Light blue color
             }
			
            colorCtx.fillStyle = rgbaColor;
            colorCtx.fillRect(0, topPosition, colorCanvas.width, colorCanvas.height - marginSize * 2);

            // Set the margin color to random
            colorCtx.fillStyle = getRandomColor();
            colorCtx.fillRect(0, 0, colorCanvas.width, marginSize); // Top margin
            colorCtx.fillRect(0, bottomPosition, colorCanvas.width, marginSize); // Bottom margin
            
            const jpegDataUrl = colorCanvas.toDataURL('image/webp');
            imgElement.src = jpegDataUrl;

            position = 'left';

    }
	populateBottomMenu(LIBRARY, TITLE, VOLUME, 30, TCONFIG);
}

function makeDraggable(element) {
    let isDragging = false;
    let offsetX, offsetY;

    element.addEventListener("mousedown", (e) => {
        // Check if the event target is an image resize handle or its parent
        const isResizeHandle = e.target.closest('.ql-image-resize-handle, .ql-image-resize');
        if (isResizeHandle) {
            return; // Ignore the event if it's from the image resize handle
        }

        isDragging = true;
        const rect = element.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;
        element.style.cursor = "grabbing";
    });

    document.addEventListener("mousemove", (e) => {
        if (isDragging) {
            const imgPageLeft = document.getElementById("imgPageLeft");
            const imgPageLeftRect = imgPageLeft.getBoundingClientRect();

            // Calculate new position
            let newLeft = e.clientX - offsetX;
            let newTop = e.clientY - offsetY;

            // Get element dimensions
            const elementWidth = element.offsetWidth;
            const elementHeight = element.offsetHeight;

            // Calculate boundaries
            const minLeft = imgPageLeftRect.left;
            const maxLeft = imgPageLeftRect.right - elementWidth;
            const minTop = imgPageLeftRect.top;
            const maxTop = imgPageLeftRect.bottom - elementHeight;

            // Clamp values to stay within imgPageLeft
            newLeft = Math.max(minLeft, Math.min(newLeft, maxLeft));
            newTop = Math.max(minTop, Math.min(newTop, maxTop));

            // Apply constrained position
            element.style.left = `${newLeft}px`;
            element.style.top = `${newTop}px`;

            // Update lastPosition
            lastPosition = { left: newLeft, top: newTop };
        }
    });

    document.addEventListener("mouseup", () => {
        if (isDragging) {
            isDragging = false;
            element.style.cursor = "move";

            // Ensure the element stays in its final position
            element.style.left = `${lastPosition.left}px`;
            element.style.top = `${lastPosition.top}px`;

            // Call updateContent to sync the position
            updateContent();
        }
    });
	
	
}


// Position update handler
function updateContent() {
    const container = document.getElementById('editorContainer');

    if (container) {
        container.style.left = `${lastPosition.left}px`;
        container.style.top = `${lastPosition.top}px`;
		container.style.border = '1px dotted transparent';

        console.log('Updated position:', lastPosition);
    }
}

async function saveBook1() {
    const imgEle = document.getElementById("imgPageLeft");
    const targetWidth = imgEle.width;
    const targetHeight = imgEle.height;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");

    const background = new Image();
    background.crossOrigin = "anonymous"; // Handle CORS if needed
    background.src = imgEle.src;

    // Wait for background image to load
    await new Promise((resolve, reject) => {
        background.onload = resolve;
        background.onerror = reject;
    });

    // Draw background onto canvas
    ctx.drawImage(background, 0, 0, targetWidth, targetHeight);

    const editorContainer = document.getElementById('editorContainer');
    if (!editorContainer) {
        console.error("Editor container not found");
        return;
    }

    // Ensure the container is visible and properly sized
    editorContainer.style.display = 'block';
    editorContainer.style.visibility = 'visible';
    editorContainer.style.position = 'absolute'; // Must be absolute/fixed

    // Set explicit dimensions if invalid
    if (!editorContainer.offsetWidth || !editorContainer.offsetHeight) {
        editorContainer.style.width = '400px'; // Match initializeQuill's default
        editorContainer.style.height = '300px';
        // Trigger reflow to apply styles
        editorContainer.offsetHeight; // eslint-disable-line
    }

    // Clone the container to isolate it during rendering
    const clone = editorContainer.cloneNode(true);
    clone.style.opacity = '1';
    document.body.appendChild(clone);

    // Calculate position relative to the background image
    const imgRect = imgEle.getBoundingClientRect();
    const editorRect = editorContainer.getBoundingClientRect();

    // Adjust for scroll and image position
    const left = editorRect.left - imgRect.left;
    const top = editorRect.top - imgRect.top;

    try {
        // Capture the cloned container with html2canvas
        const quillCanvas = await html2canvas(clone, {
            backgroundColor: null,
            scale: 1, // Avoid scaling issues
            useCORS: true,
            logging: true,
            allowTaint: true,
            onclone: (clonedDoc) => {
                // Ensure fonts/styles are inherited
                clonedDoc.getElementById('editorContainer').style.fontFamily = 'inherit';
            }
        });

        // Draw the captured content onto the main canvas
        if (quillCanvas.width > 0 && quillCanvas.height > 0) {
            ctx.drawImage(quillCanvas, left, top);
        } else {
            console.warn("Fallback rendering triggered");
            renderQuillContentFallback(ctx, editorContainer, left, top);
        }
    } catch (error) {
        console.error("html2canvas error:", error);
    } finally {
        // Clean up the cloned element
        document.body.removeChild(clone);
    }

    // Export the final image
    const finalImageDataUrl = canvas.toDataURL("image/webp");
	
	
   return finalImageDataUrl;
}

function inlineStyles(element) {
    const computedStyle = window.getComputedStyle(element);
    for (let property of computedStyle) {
        element.style[property] = computedStyle.getPropertyValue(property);
    }

    Array.from(element.children).forEach(inlineStyles);
}

function renderQuillContentFallback(ctx, editorContainer, left, top) {
    const quillContent = editorContainer.innerText || editorContainer.textContent;
    ctx.font = "16px Arial";
    ctx.fillStyle = "black";
    ctx.fillText(quillContent, left, top);
}

function getRandomColor() {
    const r = Math.floor(Math.random() * 256); // Random red value
    const g = Math.floor(Math.random() * 256); // Random green value
    const b = Math.floor(Math.random() * 256); // Random blue value
    return `rgba(${r}, ${g}, ${b}, 1)`; // Return random color
}

async function sendUserIdToServer(fileNumber) {
   
   
    Notiflix.Notify.warning('Your content will be saved and cannot be edited again')
    const imgRightElement = document.getElementById("imgPageRight");

    // Ensure image elements exist
    if (!imgRightElement) {
        alert('Missing images for saving the book.');
        return;
    }

    try {
        // Wait for the left image to be generated
        const imgLeftSrc = await saveBook1();  // ✅ FIXED: Wait for the image URL
        const imgRightSrc = imgRightElement.src;
       
        if (isNaN(fileNumber)) {
            alert("Could not extract a valid file number from the URL.");
            return;
        }

        // Generate filenames
        const leftFileName = `${fileNumber}.webp`;  
        const rightFileName = `${fileNumber + 1}.webp`;

        // Helper function to fetch image as Blob
        const fetchImageAsBlob = async (src) => {
            const response = await fetch(src);
            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${src}`);
            }
            return response.blob();
        };
          // Fetch blobs for both images
        const [leftBlob, rightBlob] = await Promise.all([
            fetchImageAsBlob(imgLeftSrc),
            fetchImageAsBlob(imgRightSrc)
        ]);

        // Prepare FormData
        const formData = new FormData();
        formData.append("userId", userId);  // Ensure `userId` is defined
        formData.append("bookName", TITLE);  // Ensure `TITLE` is defined
        formData.append("fileLeft", leftBlob, leftFileName);
        formData.append("fileRight", rightBlob, rightFileName);

        // Send the request to the server
       const response = await fetch(`${await getApiBaseURL()}/minio/save-image`, {
       method: 'POST',
       body: formData,
       });

        console.log('Response Status:', response.status); // Log status

        const contentType = response.headers.get('content-type');

        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Server error: ${text}`);
        }
		else {
			
			Notiflix.Notify.success('Your Work Is saved automatically')
       
    }
		 
    }
	
	catch (error) {
        console.error('Error:', error);
    }
}



function toggleSpeechRecognition(quill) {
    if (!annyang) {
        
		Notiflix.Notify.failure('Speech Recognition is not supported in this browser.');
        return;
    }

    console.log('Annyang loaded:', annyang);

    // Define the command for capturing speech text
    const commands = {
        '*text': function(text) {
            console.log('Recognized text:', text); // Log recognized text for debugging
            if (quill) {
                quill.insertText(quill.getLength(), text + ' ', Quill.sources.USER); // Append recognized text
                quill.setSelection(quill.getLength(), Quill.sources.SILENT); // Move cursor to the end after inserting
            } else {
                console.error('Quill editor not initialized');
            }
        }
    };

    // Add commands to annyang
    annyang.addCommands(commands);

    // Integrate SpeechKITT with annyang
    SpeechKITT.annyang();

    // Set up SpeechKITT UI
    SpeechKITT.setInstructionsText('Speak to add text');

    // Start the recognition when the UI is shown
    SpeechKITT.setStartCommand(() => {
        console.log('Speech recognition started');
        annyang.start({
            autoRestart: true,
            continuous: true
        }); // Start Annyang with options
    });

    // Set up the abort command to stop recognition
    SpeechKITT.setAbortCommand(() => {
        console.log('Speech recognition stopped');
        annyang.abort(); // Stop Annyang recognition
    });

    // Render SpeechKITT UI
    SpeechKITT.vroom();
}

function applyEditor(src) {
    if (!src) return;

    const imgEle = document.getElementById("imgPageLeft");
    const targetWidth = imgEle.width;
    const targetHeight = imgEle.height;

    // Create a canvas for combining background and new image
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext("2d");

    // Draw the existing background onto the canvas
    const background = new Image();
    background.src = imgEle.src;

    background.onload = function () {
        ctx.drawImage(background, 0, 0, targetWidth, targetHeight);

        // Load and draw the new image
        const tempImage = new Image();
        tempImage.onload = function () {
            // Draw the new image on top of the background
            ctx.drawImage(tempImage, 0, 0, targetWidth, targetHeight);

            // Update the imgPageLeft source with the combined image
            imgEle.src = canvas.toDataURL("image/webp"); // or "image/png" or "image/jpeg"
        };

        tempImage.src = src; // Load the new image source
		createEditorOverlay('imgPageLeft', position, targetWidth, targetHeight)
		
		
    };
}


function toggleHandlerElement(button, variableName, targets, className, refreshPages = false) {
    document.getElementById(button).onclick = function() {
        UCONFIG[variableName] = !UCONFIG[variableName];
        for (let i = 0; i < targets.length; i++) {
            if (UCONFIG[variableName]) {
                document.getElementById(targets[i]).classList.add(className[i]);
            } else {
                document.getElementById(targets[i]).classList.remove(className[i]);
            }
        }
        if (refreshPages) refreshDisplayPages();
    };
}
// Function to save the current template and textarea content


function goNextPage() {
    if (UCONFIG.doublePage) {
        changePage(PAGE + 2);


    } else {
        changePage(PAGE + 1);
    }
}

function goPreviousPage() {
    if (UCONFIG.doublePage) {
        changePage(PAGE - 2);
    } else {
        changePage(PAGE - 1);
    }
}

function changePage(newPage = null) {

    //removeTextArea();
    // When launch for the first time
    if (newPage == null) {

        // const paramChapter = parseInt(findGetParameter('chapter'));
        const paramPage = parseInt(findGetParameter('page'));
      
        // If a page is indicated in the GET
        if (!Number.isNaN(paramPage)) {
            newPage = paramPage;
            // If a chapter is indicated in the GET
        } 
		else {
            newPage = 1;
        }

    } else {

        /* Sanitize the parameters before actually changing the actual values */
        if (newPage < 1) {
            newPage = 1;
        } else if (newPage > VCONFIG.numPages) {
            newPage = VCONFIG.numPages;
        }

        // Correction for current page position depending on double page
        if (isDoublePagePossible(newPage) && newPage > 1) {
            if (VCONFIG.firstPagesDouble && newPage % 2 == 0) newPage -= 1;
            if (!VCONFIG.firstPagesDouble && newPage % 2 == 1) newPage -= 1;
        }

    }

    const hasPageChanged = newPage != PAGE;

    PAGE = newPage;


    if (hasPageChanged) {
        //removeTextArea();

        refreshDisplayPages();
    }

    // Update the slider background gradient
    {
        const currentPosition = (parseInt(pageSlider.value) - 1) / (parseInt(pageSlider.max) - 1) * 100;
        pageSlider.style.background = "linear-gradient(90deg, var(--menu-text-color) 0%, var(--menu-text-color) " + currentPosition.toString() + "%, gray " + currentPosition.toString() + "%, gray 100%)";
    }

 }

function addLoading() {
    ELEM_LOADING++;
    refreshLoading();
}

function removeLoading() {
    ELEM_LOADING--;
    refreshLoading();
}

function refreshLoading() {
    if (ELEM_LOADING > 0) {
        document.getElementById('loader').classList.add('enabled');
    } else {
        document.getElementById('loader').classList.remove('enabled');
    }
}

function isDoublePagePossible(targetPage = PAGE) {
    // To use double page, the user should have asked for double page
    let result = UCONFIG.useDoublePage;

    // To use double page, VCONFIG.disallowDoublePage should be true
    result &= !VCONFIG.disallowDoublePage;

    // If the VCONFIG file asked for the fist page to be single, doublePage should
    // only be enable for pages other than the first one
    result &= !(!VCONFIG.firstPagesDouble && targetPage == 1);

    // Lastly double page should be disable if the last page is left alone.
    result &= targetPage + 1 <= VCONFIG.numPages;

    return result;
}

function refreshSidePages() {
    /* Move the side page to simulate the fact that you place the next page on the side */
    if (UCONFIG.sidePages && UCONFIG.doublePage) {
        const sidePageMaxValue = Math.min(VCONFIG.numPages / 150 * 4, 6);
        const progress = PAGE / VCONFIG.numPages;
        const viewedPagesWidth = (progress * sidePageMaxValue * pageWidthSlider.value / 100).toString() + "vmin";
        const toBeViewedPagesWidth = ((1 - progress) * sidePageMaxValue * pageWidthSlider.value / 100).toString() + "vmin";

        if (TCONFIG.japaneseOrder) {
            navImage.style.paddingLeft = toBeViewedPagesWidth;
            navImage.style.paddingRight = viewedPagesWidth;
        } else {
            navImage.style.paddingLeft = viewedPagesWidth;
            navImage.style.paddingRight = toBeViewedPagesWidth;
        }
        document.getElementById("lighting").style.backgroundSize = "calc(100% + " + (navImage.style.paddingLeft).toString() + " - " + (navImage.style.paddingRight).toString() + ") 100%";
        document.getElementById("specular").style.backgroundSize = "calc(100% + " + (navImage.style.paddingLeft).toString() + " - " + (navImage.style.paddingRight).toString() + ") 100%";
        document.getElementById("bookFold").style.backgroundSize = "calc(100% + " + (navImage.style.paddingLeft).toString() + " - " + (navImage.style.paddingRight).toString() + ") 100%";

    } else {

        navImage.style.paddingLeft = null;
        navImage.style.paddingRight = null;
        document.getElementById("lighting").style.backgroundSize = null;
        document.getElementById("specular").style.backgroundSize = null;
        document.getElementById("bookFold").style.backgroundSize = null;

    }

}

function refreshDisplayPages() {

    //removeTextArea();
    //textAreaLeft.readOnly = textAreaLeft.style.visibility === 'hidden';
    //extAreaRight.readOnly = textAreaRight.style.visibility === 'hidden';
    if (TCONFIG.bookType == 'webtoon') {

        window.scrollTo(0, 0);

        /* -------------------------- FOR BOOK MODE ONLY (NOT CONTINUOUS SCROLLING) ------------------------------------*/
    } else {

        UCONFIG.doublePage = isDoublePagePossible();

        if (UCONFIG.doublePage) {
            imgPageRight.style.display = null;
            navImage.classList.add("doublePage");
        } else {
            imgPageRight.style.display = "none";
            navImage.classList.remove("doublePage");
        }
               const cacheBuster = new Date().getTime() + Math.random();
        /* Load the current page*/
        {

             const leftPageURL = infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE, TCONFIG.fileExtension) + "?t=" + cacheBuster;
                 
            if (UCONFIG.doublePage) {

                const rightPageURL = infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE + 1, TCONFIG.fileExtension) + "?t=" + cacheBuster;;

                addLoading();
                getImage(rightPageURL).then(function(successUrl) {
                    imgPageRight.src = rightPageURL;
                    removeLoading();
                });

            }

            addLoading();
            getImage(leftPageURL).then(function(successUrl) {
                imgPageLeft.src = leftPageURL;
                //imgFinishedLoading();
                removeLoading();

            });

        }
        destroyQuill(position);
        refreshSidePages();

        if (UCONFIG.useDoublePage) {
            document.getElementById("bookFoldButton").style.display = null;
            document.getElementById("sidePagesButton").style.display = null;
        }
    }

    /* -------------------------- FOR BOTH BOOK MODE AND CONTINUOUS SCROLLING ------------------------------------*/

    /*  Replace the current URL without reloading the page.
        Furthermore, if the use use to go back button, it will not go to the
        previous image but the actual previous page */
    {
        if (window.history.replaceState) {
            //prevents browser from storing history with each change:
            const newURL = infoToPageURL(LIBRARY, TITLE, VOLUME, PAGE);
            window.history.replaceState(null, '', newURL);
        }
    }


    /* Refresh the slider bar */
    {
        pageSlider.max = VCONFIG.numPages;
        pageSlider.value = PAGE.toString();
        pageSliderCurrent.innerHTML = PAGE.toString();
        pageSliderTotal.innerHTML = VCONFIG.numPages;
        previousChapterButton.innerHTML = PAGE.toString();
    }


    document.getElementById("paperTexture").style.backgroundPosition = Math.floor((Math.random() * 100) + 1).toString() + "%" + Math.floor((Math.random() * 100) + 1).toString() + "%";

    // Refresh the book info at the top
    bookVolume.innerHTML = LCONFIG.titlePage.volume + " " + VOLUME;


}


// -----------------------------------------------------------------------------


function setHandlers() {
    /* EVENTS HANDLERS */

    /* -------------------------- FOR BOOK MODE ONLY (NOT CONTINUOUS SCROLLING) ------------------------------------*/
    if (TCONFIG.bookType != 'webtoon') {
        document.onkeydown = function() {

                switch (window.event.keyCode) {
                    case 34:
                        goPreviousPage();
                        break;
                    case 33:
                        goNextPage();
                        break;
                    case 37:
                        goPreviousPage();
                        break;
                    case 39:
                        goNextPage();
                        break;
                
            }
        };

    
        pageSlider.oninput = function() {

            changePage(parseInt(pageSlider.value));
            //getTextArea();
            //saveImageDataAndText(jpegDataUrl,textAreaObject);


        }

        pageSlider.onmousedown = function() {
            pageSlider.classList.add("inUse");
        }

        pageSlider.onmouseup = function() {
            document.activeElement.blur(); // Remove focus
            pageSlider.classList.remove("inUse");
        }

        toggleHandlerElement("doublePageButton", "useDoublePage", ["doublePageButton"], ["enabled"], true);
        toggleHandlerElement("bookFoldButton", "bookFold", ["bookFoldButton", "bookFold"], ["enabled", "enabled"]);
        toggleHandlerElement("lightingButton", "lighting", ["lightingButton", "lighting", "specular"], ["enabled", "enabled", "enabled"]);
        toggleHandlerElement("sidePagesButton", "sidePages", ["sidePagesButton"], ["enabled"], true);
        toggleHandlerElement("paperTextureButton", "paperTexture", ["paperTextureButton", "paperTexture"], ["enabled", "enabled"]);
        toggleHandlerElement("bookShadowButton", "bookShadow", ["bookShadowButton", "navImage"], ["enabled", "bookShadow"]);

        zoom(undefined, undefined, function(actionType) {
            // if (actionType == "clickMiddle") {
                // toggleNavMenu();

            // } else {

                // toggleNavMenu();
            // }
        });
        document.getElementsByClassName("zoom")[0].click();


        pageWidthSlider.oninput = function() {
            // UCONFIG.pageWidthSlider = pageWidthSlider.value;
            UCONFIG.pageWidthSlider = 70;
            refreshLayoutNavImage();
        }


        /* -------------------------- FOR CONTINUOUS SCROLLING MODE ONLY ------------------------------------*/
    } else {

        toggleHandlerElement("paperTextureButton", "continuousScrolling_paperTexture", ["paperTextureButton", "paperTexture"], ["enabled", "enabled"]);
        toggleHandlerElement("bookShadowButton", "continuousScrolling_bookShadow", ["bookShadowButton", "navImage"], ["enabled", "bookShadow"]);

        pageWidthSlider.oninput = function() {
            // UCONFIG.pageWidthSlider = pageWidthSlider.value;
            UCONFIG.pageWidthSlider = 70;
            document.getElementById("continuousScrollingPages").style.width = UCONFIG.pageWidthSlider + "vw";
        }

        // document.getElementById("navImageContainer").onclick = function() {
        //     toggleNavMenu();

        // }

        {
            document.getElementsByTagName('body')[0].classList.add("continuousScrolling");
            imgPageLeft.style.display = "none";
            imgPageRight.style.display = "none";
            sliderContainer.style.display = "none";
            document.getElementById("continuousScrollingPages").style.width = 70 + "vw";
        }

    }

    /* -------------------------- FOR BOTH BOOK AND SCROLLING MODE ------------------------------------*/

    pageWidthSlider.onmouseup = function() {
        document.activeElement.blur(); // Remove focus
    }

    window.addEventListener('resize', function(event) {
        refreshLayoutNavImage();
    }, true);


    fullScreenButton.onclick = function() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (document.fullscreenEnabled) {
            document.documentElement.requestFullscreen({
                navigationUI: "hide"
            });
        }
    }


    document.onfullscreenchange = function(event) {
        if (document.fullscreenElement) {
            fullScreenButton.classList.add("enabled");
        } else {
            fullScreenButton.classList.remove("enabled");
        }
    }

    themeSelection.onchange = function() {

        // Save value to cookie
        UCONFIG.themeSelection = themeSelection.selectedIndex;

        // Remove all other theme
        for (let themeName in LCONFIG.readPage.configMenu.themeSelection) {
            body.classList.remove(themeName);
        }

        // Add the new theme
        body.classList.add(themeSelection.options[UCONFIG.themeSelection].value);
        document.activeElement.blur(); // Remove focus
    }

    languageSelection.onchange = function() {
        // Save value to cookie
        UCONFIG.lang = languageSelection.options[languageSelection.selectedIndex].value;
        fetchLanguage(UCONFIG.lang)
            .then(languageData => LCONFIG = languageData)
            .then(applyLanguage);
    }

    toggleHandlerElement("configButton", "configOpened", ["configMenu"], ["enabled"]);

    document.getElementById("closeMenu").onclick = function() {
        document.getElementById("configButton").click();
    };

    /* Populate the languageSelection menu with the languages from the lang/config.json */
    for (let key in LANGUAGES) {
        const option = document.createElement("option");
        option.text = LANGUAGES[key];
        option.value = key;
        languageSelection.appendChild(option);
    }

    const keys = Object.keys(LANGUAGES);
    for (let i in keys) {
        if (keys[i] == UCONFIG.lang) {
            languageSelection.selectedIndex = parseInt(i);
        }
    }

    if (VCONFIG.disallowDoublePage) doublePageButton.style.display = "none";

    // Refresh the book info at the top
    bookTitle.innerHTML = TCONFIG.title;

    if (TCONFIG.numVolumes < 2) {
        document.getElementById("bookVolume").style.display = "none";
    }

    // Hide config options when not suited
    if (!BOOKTYPE.useDoublePage) document.getElementById("doublePageButton").style.display = "none";
    if (!BOOKTYPE.bookFoldButton) document.getElementById("bookFoldButton").style.display = "none";
    if (!BOOKTYPE.sidePagesButton) document.getElementById("sidePagesButton").style.display = "none";
    if (!BOOKTYPE.lightingButton) document.getElementById("lightingButton").style.display = "none";
    if (!BOOKTYPE.paperTextureButton) document.getElementById("paperTextureButton").style.display = "none";
    if (!BOOKTYPE.bookShadowButton) document.getElementById("bookShadow").style.display = "none";
    document.getElementsByTagName("body")[0].style.touchAction = BOOKTYPE.touchAction;

    // Change the title of the webpage
    document.title = CONSTANTS.websiteName() + ' - ' + TCONFIG.title;

    // Apply type of book on the body
    body.classList.add(TCONFIG.bookType);

    // Event when the user leave/close the page
    window.onbeforeunload = function() {
        // Save the current UCONFIG state as cookie
        for (let [key, value] of Object.entries(UCONFIG)) {
            if (value != undefined) {
                if (getCookie(key) != value.toString()) setCookie(key, value, 365);
            }
        }

        // Save current position in the volume in cookies
        const pos = getPosCookie(TITLE, true);
        pos[VOLUME] = PAGE;
        setPosCookie(pos, TITLE);
    };

}

function applyLanguage() {
    /* Localize all the options in the config menu */
    for (let key in LCONFIG.readPage.configMenu) {
        if (typeof LCONFIG.readPage.configMenu[key] === 'string') {
            document.getElementById(key).getElementsByTagName('p')[0].innerHTML = LCONFIG.readPage.configMenu[key];
        }
    }

    /* Populate the themeSelection menu with the themes from the language file */
    const currentThemeSelection = themeSelection.selectedIndex;
    themeSelection.innerHTML = "";
    for (let key in LCONFIG.readPage.configMenu.themeSelection) {
        const option = document.createElement("option");
        option.text = LCONFIG.readPage.configMenu.themeSelection[key];
        option.value = key;
        themeSelection.appendChild(option);
    }
    themeSelection.selectedIndex = currentThemeSelection;

    bookVolume.innerHTML = LCONFIG.titlePage.volume + " " + VOLUME;
}

function applyCookie() {

    themeSelection.selectedIndex = parseInt(getCookie('themeSelection') || 0);
    themeSelection.onchange();

    let defaultWidthSlider;
    if (TCONFIG.bookType === 'webtoon') {
        if (window.innerHeight > window.innerWidth) {
            defaultWidthSlider = 100;
        } else {
            defaultWidthSlider = 40;
        }
    } else {
        defaultWidthSlider = 90;
    }
    pageWidthSlider.value = parseInt(getCookie('pageWidthSlider') || defaultWidthSlider);
    pageWidthSlider.oninput();

    // If screen is in landscape mode, realistic options are true by default
    const defaultRealisticOption = window.innerWidth > window.innerHeight;

    // Everytime, we set the inverse of what we want and then click on the button to get back to the state we want
    if (BOOKTYPE.bookFoldButton) {
        const cookieValue = getCookie('bookFold');
        UCONFIG.bookFold = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
        bookFoldButton.click();
    }

    if (BOOKTYPE.lightingButton) {
        const cookieValue = getCookie('lighting');
        UCONFIG.lighting = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
        lightingButton.click();
    }

    if (BOOKTYPE.paperTextureButton) {
        const cookieValue = getCookie('paperTexture');
        UCONFIG.paperTexture = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
        paperTextureButton.click();
    }

    if (BOOKTYPE.sidePagesButton) {
        const cookieValue = getCookie('sidePages');
        UCONFIG.sidePages = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
        sidePagesButton.click();
    }

    if (BOOKTYPE.bookShadowButton) {
        const cookieValue = getCookie('bookShadow');
        UCONFIG.bookShadow = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
        bookShadowButton.click();
    }

    if (BOOKTYPE.useDoublePage) {
        const cookieValue = getCookie('useDoublePage');
        UCONFIG.useDoublePage = cookieValue !== '' ? !stringToBoolean(cookieValue) : !defaultRealisticOption;
        doublePageButton.click();
    }

}

function getDOMElements() {

    imgPageLeft = document.getElementById("imgPageLeft");
    imgPageRight = document.getElementById("imgPageRight");

    pageSliderCurrent = document.getElementById("pageSliderLeft");
    pageSliderTotal = document.getElementById("pageSliderRight");

    previousChapterButton = document.getElementById("leftChapterButton");
    nextChapterButton = document.getElementById("rightChapterButton");
     
}
 document.getElementById("saveButton").onclick = function() {
       saveBook();
    };
	 document.getElementById("updateBookInfo").onclick = function() {
       updateBookInfo();
    };
	
function saveBook() {
    const bookName = TITLE;
    // Get image elements
    const imgPageLeft = document.getElementById('imgPageLeft');
    const imgPageRight = document.getElementById('imgPageRight');

    // Extract file number from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const fileNumber = parseInt(urlParams.get('page'));

    if (isNaN(fileNumber)) {
        alert("Could not extract a valid file number from the URL.");
        return;
    }

    if (!imgPageLeft || !imgPageRight) {
        alert('Missing images for saving the book.');
        return;
    }

    // Generate dynamic filenames
    const leftFileName = `${fileNumber}.webp`;  // Adjust extension as needed
    const rightFileName = `${fileNumber+1}.webp`;


    // Helper function to fetch image as Blob
    const fetchImageAsBlob = (src) => {
        return fetch(src)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Failed to fetch image: ${src}`);
                }
                return response.blob();
            });
    };

    // Fetch blobs and send API request
    Promise.all([
        fetchImageAsBlob(imgPageLeft.src),
        fetchImageAsBlob(imgPageRight.src)
    ])
        .then(([leftBlob, rightBlob]) => {
            // Prepare FormData
            const formData = new FormData();
            formData.append("userId", userId);
            formData.append("bookName", bookName);
            formData.append("fileLeft", leftBlob, leftFileName);
            formData.append("fileRight", rightBlob, rightFileName);
           
            // API call
            return fetch(`${getApiBaseURL()}/book-infos`, {
                method: 'POST',
                body: formData,
            });
        })
        .then(response => {
			
            if (!response.ok) {
                throw new Error('Failed to save book');
            }
            Notiflix.Notify.success('Book saved successfully!');
        })
       
}


function getBaseURL() {
    return typeof window !== 'undefined' && window.location && window.location.origin 
        ? window.location.origin           // e.g., http://localhost:8080
        : 'http://localhost:8000';         // Fallback aligns with your Nginx port
}


function populateBottomMenu(LIBRARY, TITLE, VOLUME, totalPages, TCONFIG) {
    const navContainer = document.querySelector("#bottomMenu .navContainer");
    navContainer.innerHTML = ""; // Clear existing content

    for (let page = 1; page <= totalPages; page++) {
        const cacheBuster = new Date().getTime(); // Generates a timestamp as a cache buster
        const leftPageURL = infoToImageURL(LIBRARY, TITLE, VOLUME, page, ".webp") + "?t=" + cacheBuster;

        const imgElement = document.createElement("img");
        imgElement.src = leftPageURL;
        imgElement.dataset.pageNumber = page; // Store the page number in a data attribute

        // Add click event listener
        imgElement.addEventListener("click", function () {
            const clickedPage = this.dataset.pageNumber;
            changePage(parseInt(clickedPage)); 
        });

        const divElement = document.createElement("div");
        divElement.appendChild(imgElement);
        
        navContainer.appendChild(divElement);
    }
}
window.onload = function () {
    const nextButton = document.getElementById("nextPageButton");
    if (!nextButton) {
        console.error("nextPageButton not found in DOM.");
        return;
    }

    nextButton.onclick = async function () {
        console.log("Next button clicked");

        const urlParams = new URLSearchParams(window.location.search);
        const fileNumber = parseInt(urlParams.get('page'));

        if (isNaN(fileNumber)) {
            alert("Invalid page number in URL.");
            return;
        }

        await sendUserIdToServer(fileNumber);
		destroyQuill(position);
        goNextPage();
    };
	
	const prevButton = document.getElementById("prevPageButton");
	
	 if (!prevButton) {
        console.error("prevButton not found in DOM.");
        return;
    }

    prevButton.onclick = async function () {
        console.log("prevButton button clicked");
        destroyQuill(position);
        goPreviousPage();
    };
};

function getApiBaseURL() {
    if (typeof window !== 'undefined' && window.location) {
        const { protocol, hostname } = window.location;
        return `${protocol}//${hostname}:8080/api`;
    }
    // Fallback for local dev
    return 'http://localhost:8080/api';
}

 
function updateBookInfo() {
    // Replace with actual dynamic values for bookName and userID
    const bookName = TITLE;
    const formData = new FormData();
    formData.append("userID", userId);
    formData.append("bookName", bookName);
    // Alert for debugging
    alert(`User ID: ${userId}, Book Name: ${bookName}`);

    // Construct the URL with query parameters
    const url = `${getApiBaseURL()}/book-infos/1`;

    // Make the PUT request
    fetch(url, {
        method: 'PUT',
		body: formData,
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to save book');
        })
        .then(data => {
            console.log('Book updated successfully:', data);
			Notiflix.Notify.success('Book updated successfully!');
           
        })
        .catch(error => {
            console.error('Error:', error);
			Notiflix.Notify.failure('Error updating the book');

            
        });
}

 



function setBookTypeConfig() {
    BOOKTYPE = {
        "useDoublePage": false,
        "bookFoldButton": false,
        "sidePagesButton": false,
        "lightingButton": false,
        "paperTextureButton": false,
        "bookShadowButton": false,
        "touchAction": "none"
    }

    switch (TCONFIG.bookType) {
        case "imageset":
            BOOKTYPE.bookShadowButton = true;
            break;
        
        case "book":
            BOOKTYPE.useDoublePage = true;
            BOOKTYPE.bookFoldButton = true;
            BOOKTYPE.sidePagesButton = true;
            BOOKTYPE.lightingButton = true;
            BOOKTYPE.paperTextureButton = true;
            BOOKTYPE.bookShadowButton = true;
            break;
    }
}

// -----------------------------------------------------------------------------
let imgPageLeft;
let imgPageRight;
let previousChapterButton;
let nextChapterButton;
let pageSliderCurrent;
let pageSliderTotal;

const navImage = document.getElementById("navImage");
const bookTitle = document.getElementById("bookTitle");
const bookVolume = document.getElementById("bookVolume");
const body = document.getElementsByTagName("body")[0];

const fullScreenButton = document.getElementById("fullScreenButton");
const doublePageButton = document.getElementById("doublePageButton");

const themeSelection = document.getElementById("themeSelection");
const languageSelection = document.getElementById("languageSelection");
//const chapterSelection = document.getElementById("chapterSelection");
const pageSlider = document.getElementById("pageSlider");
const pageWidthSlider = document.getElementById("pageWidthSlider");


const libraryParam = findGetParameter('library');
const LIBRARY = libraryParam ? libraryParam : CONSTANTS.booksURL();

const TITLE = findGetParameter('title');

// Retrieve the VOLUME
const volumeParam = parseInt(findGetParameter('volume'));
const VOLUME = !Number.isNaN(volumeParam) ? volumeParam : 1;

let PAGE; // Stores the current page

let UCONFIG = {} // User CONFIG that will be saved as cookies
let LCONFIG; // Language JSON config File
let TCONFIG; // Title JSON config File
let VCONFIG; // Volume JSON config File

let IS_BAR_VISIBLE = true; // are the navbars visible
let ELEM_LOADING = 0; // The number of element currently loading

let LANGUAGES; // Stores the list of available languages

let BOOKTYPE; // Store the specific configuration for this type of document (book, manga, webtoon, imageset...)

fetchLanguages()
    .then(languages => LANGUAGES = languages.languages)
    .then(chooseLanguage)
    .then(language => UCONFIG.lang = language)
    .then(() => fetchLanguage(UCONFIG.lang))
    .then(languageData => LCONFIG = languageData)
    .then(() => fetchLibrary(LIBRARY))
    .then(libraryData => assertsTitleExists(libraryData.titles, TITLE))
    .then(() => fetchBook(LIBRARY, TITLE))
    .then(bookData => TCONFIG = bookData)
    .then(setBookTypeConfig)
    .then(getDOMElements)
    .then(() => fetchVolume(LIBRARY, TITLE, VOLUME))
    .then(volumeData => VCONFIG = volumeData)
    .then(applyLanguage)
    .then(changePage)
    .then(setHandlers)
    .then(applyCookie);

    //---------------------------------------------------------------------------------
    //accordian open and close
    //accordian open and close
document.addEventListener("DOMContentLoaded", () => {
    // Select all accordion headers
    const accordionHeaders = document.querySelectorAll("#accordion > div:not(.inner-content)");

    accordionHeaders.forEach(header => {
        header.addEventListener("click", () => {
            const panel = header.nextElementSibling;
            const caretIcon = header.querySelector(".caret-icon");

            // Close all panels except the one being clicked
            accordionHeaders.forEach(otherHeader => {
                const otherPanel = otherHeader.nextElementSibling;
                const otherCaretIcon = otherHeader.querySelector(".caret-icon");

                if (otherPanel !== panel) {
                    otherPanel.style.display = "none";
                    if (otherCaretIcon) {
                        otherCaretIcon.src = "./img/icon/caret-down-solid.svg"; // Update to caret-down icon
                    }
                }
            });

            // Toggle the clicked panel
            const isOpen = panel.style.display === "block";
            panel.style.display = isOpen ? "none" : "block";

            // Update the caret icon for the clicked panel
            if (caretIcon) {
                caretIcon.src = isOpen
                    ? "./img/icon/caret-down-solid.svg"
                    : "./img/icon/caret-up-solid.svg";
            }
        });
    });

    // Drag-and-drop functionality
    const stickers = document.querySelectorAll(".sticker img");
    stickers.forEach(sticker => {
        sticker.addEventListener("dragstart", event => {
            event.dataTransfer.setData("text/plain", event.target.src);
        });
    });

    // Start tutorial (Ensure steptip is defined before calling it)
  

    // Tooltip initialization with animation
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl, {
            animation: true, // Enables Bootstrap's built-in animation
            delay: { show: 300, hide: 100 } // Adds a delay for a smooth effect
        });
    });
	document.getElementById("generateStoryBtn").addEventListener("click", generateStory);
});

// Append images to Slick slider
function appendToSlider(imageUrls) {
    console.log("Received image URLs:", imageUrls);
 // Show the received URLs

    // Ensure Slick is initialized before adding slides
    if (typeof $ === "undefined" || typeof $.fn.slick === "undefined") {
        console.error("Slick is not loaded or jQuery is missing!");
        return;
    }

    const slider =  $("#element1").next(".inner-content").find(".vertical-center-4");

    if (!slider.length) {
        console.error("Slider element '.vertical-center-4' not found!");
        return;
    }

    // If Slick is not initialized, initialize it
    if (!slider.hasClass("slick-initialized")) {
        console.warn("Slick slider not initialized, initializing now...");
        slider.slick({
            dots: false,
            infinite: true,
            slidesToShow: 4,
            slidesToScroll: 2,
            centerMode: true,
            vertical: true,
            verticalSwiping: true,
            autoplay: true,
            adaptiveHeight: true,
            autoplaySpeed: 3000,
            arrows: true,
            responsive: [
                {
                    breakpoint: 1024,
                    settings: {
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        infinite: true,
                        dots: true
                    }
                },
                {
                    breakpoint: 768,
                    settings: {
                        slidesToShow: 2,
                        slidesToScroll: 1
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                        slidesToScroll: 1
                    }
                }
            ]
        });
    }

    // Add images to the slider
    imageUrls.forEach(url => {
        console.log("Adding image:", url);
        slider.slick('slickAdd', `<div><img src="${url}" style="width: 100%; height: 150px; object-fit: fill;" class="slick-slide" /></div>`);
    });

    // Ensure the newly added images are shown first
    setTimeout(() => {
        slider.slick('slickGoTo', 0); // Move to the first slide
        slider.slick('slickPlay'); // Restart autoplay if enabled
    }, 300); // Give a slight delay to ensure proper rendering

    console.log("Images added and slider moved to first image.");
	
// Event delegation to handle click on images (even dynamically added ones)
 $(document).on("click", ".accordion-title:contains('Scenes') + .inner-content .vertical-center-4 img", async function () {
    const selectedImageSrc = $(this).attr("src");
    try {
        const resizedImageSrc = await resizeImageWithCompression(selectedImageSrc, 448, 600);
        if (resizedImageSrc) {
            applyTemplate(resizedImageSrc);
        }
    } catch (error) {
        console.error("Image resizing failed:", error);
    }
});

}


    //--------------------------------------------------------------------
    $(document).on('ready', function () {
        $(".vertical-center-4").slick({
            dots: false,
            infinite: true,
            slidesToShow: 4,
            slidesToScroll: 2,
            centerMode: true,
            autoplay: true,
            autoplaySpeed: 3000,
            arrows: true,
            responsive: [
                {
                    breakpoint: 1024,
                    settings: {
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        infinite: true,
                        dots: true,
                    }
                },
                {
                    breakpoint: 768,
                    settings: {
                        slidesToShow: 2,
                        slidesToScroll: 1,
                    }
                },
                {
                    breakpoint: 480,
                    settings: {
                        slidesToShow: 1,
                        slidesToScroll: 1,
                    }
                }
            ]
        });
      
    });
populateBottomMenu(LIBRARY, TITLE, VOLUME, 30, TCONFIG);
import { spotlight } from 'https://cdn.jsdelivr.net/gh/cttricks/spotlight.js/dist/spotlight.min.js';
const Spotlight = await spotlight();
Spotlight.start({ from: 1});
// Story generation function
async function generateStory() {
    const storyPromptInput = document.getElementById("storyPrompt");
    const prompt = storyPromptInput.value.trim();
    if (!prompt) return alert("Please enter a prompt.");
    storyPromptInput.disabled = true;
    generateStoryBtn.disabled = true;
    try {
		addLoading();
        const response = await fetch(`http://148.100.78.182:1000/generate/?prompt=${encodeURIComponent(prompt)}`, { method: "POST" });
        if (!response.ok) throw new Error("Failed to fetch images");

        const data = await response.json();
		
        if (data.status === "success" && data.data.images.length > 0) {
			removeLoading();
            appendToSlider(data.data.images.map((img) => img.url));
        } else {
            alert("No images found.");
			removeLoading();
        }
    } catch (error) {
        console.error("Error fetching images:", error);
        alert(`Error fetching images: ${error.message}`);
    }
	finally {
        // Enable input and button after success or failure
        storyPromptInput.disabled = false;
        generateStoryBtn.disabled = false;
        removeLoading();
    }
}
async function resizeImageWithCompression(imageSrc, width, height) {
    try {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "Anonymous"; // Prevent CORS issues if needed
            img.src = imageSrc;

            img.onload = () => {
                // Create a canvas and draw the image
                const canvas = document.createElement("canvas");
                const ctx = canvas.getContext("2d");

                // Set the new dimensions
                canvas.width = width;
                canvas.height = height;

                // Resize the image to fit the new dimensions
                ctx.drawImage(img, 0, 0, width, height);

                // Convert canvas to WEBP Data URL
                const webpDataUrl = canvas.toDataURL("image/webp", 0.8); // Adjust quality (0.8 is optimal)

                resolve(webpDataUrl); // Return WEBP image as Data URL
            };

            img.onerror = () => reject(new Error("Failed to load image for resizing"));
        });

    } catch (error) {
        console.error("Image resizing failed:", error);
        return null;
    }
}

	