"use strict";
import {
    zoom
} from './directive.js';
import * as CONSTANTS from './constants.js';
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
let textArea = null;
let canvas, colorCanvas;
let jpegDataUrl = null;
let colorCtx = null;
let textAreaObject = null;
let position = null;


function getImage(url) {
    return new Promise(function(resolve, reject) {
        const img = new Image();
        img.onload = function() {
            resolve(url);
        }
        img.onerror = function() {
            reject(url);
        }
        img.src = url;
    })
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

// Function to handle the image selection
function handleImageSelection(src) {
    destroyQuill(position);
    applyTemplate(src);

}
let quillLeft, quillRight;
let editorContainer;

function initializeQuill(position, canvasWidth, canvasHeight) {
    const quillWidth = canvasWidth / 2;
    const quillHeight = canvasHeight / 2;
    const Font = Quill.import('formats/font');
    Font.whitelist = ['mirza', 'roboto'];
    Quill.register(Font, true);

    if (!editorContainer) {
        editorContainer = document.createElement('div');
        editorContainer.id = 'editorContainer';
        document.body.appendChild(editorContainer);
    }

    const quillDiv = document.createElement('div');
    quillDiv.id = position === 'left' ? 'quillLeft' : 'quillRight';
    quillDiv.style.position = 'fixed'; // Changed to fixed
    quillDiv.style.left = '350px'; // Adjust as necessary
    quillDiv.style.top = '100px'; // Adjust as necessary
    quillDiv.style.width = `${quillWidth}px`; // Adjust as necessary
    quillDiv.style.height = `${quillHeight}px`; // Adjust as necessary
    quillDiv.setAttribute('spellcheck', 'true');
    editorContainer.appendChild(quillDiv);

    const quill = new Quill(`#${quillDiv.id}`, {
        theme: 'bubble', // Changed to bubble theme
        modules: {
            toolbar: [
                ['bold', 'italic', 'underline'], // Basic styling
                [{
                    'list': 'ordered'
                }, {
                    'list': 'bullet'
                }], // Lists
                [{
                    'align': []
                }], // Alignment
                ['link', 'image'], // Links and images
                [{
                    'color': []
                }, {
                    'background': []
                }] // Font color and background options
            ]
        }
    });

    // Set default font color to black
    quill.setContents([{
        insert: ' ',
        attributes: {
            color: 'black'
        }
    }]);
          quill.on('text-change', function(delta, oldDelta, source) {
 
    animateActiveLine(quill);
  
});
    // Store reference to the quill instance
    if (position === 'left') {
        quillLeft = quill;
    } else {
        quillRight = quill;
    }
        
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
    const range = quill.getSelection();
    if (range) {
        const [line, offset] = quill.getLine(range.index);

        // Check if we're on a new line
        if (line !== previousLine) {
            // Clear animation from the previous line
            if (previousLine) {
                previousLine.domNode.classList.remove('line-highlight');
            }

            // Apply animation to the current line
            line.domNode.classList.add('line-highlight');

            // Update the previous line to the current one
            previousLine = line;
        }
    }
}


// Add an event listener for text changes

function applyTemplate(src) {
    const imgElement = document.getElementById("imgPageLeft");
    const imgPageElement = document.getElementById("imgPageRight");
    const imgSrc = imgElement.src;
    const urlParams = new URLSearchParams(window.location.search);
    const fileNumber = parseInt(urlParams.get('page'));
    if (isNaN(fileNumber)) {
        alert("Could not extract a valid file number from the URL.");
        return;
    }

    alert(fileNumber); // Should alert 28

    if (fileNumber % 2 === 1) { // Odd number
        imgElement.src = src;

        const canvasWidth = imgElement.width;
        const canvasHeight = imgElement.height;
        position = 'right';
        initializeQuill(position, canvasWidth, canvasHeight);
        quillRight.enable(); // Enable editing for the right Quill editor
        if (quillLeft) quillLeft.enable(false); // Disable editing for the left Quill editor if initialized
    } else { // Even number
        imgPageElement.src = src;

        imgPageElement.onload = function() {
            const canvasWidth = imgPageElement.width;
            const canvasHeight = imgPageElement.height;

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', {
                willReadFrequently: true
            });
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            ctx.drawImage(imgPageElement, 0, 0);

            const imageData = ctx.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data;
            const rgbaColor = `rgba(${imageData[0]}, ${imageData[1]}, ${imageData[2]}, ${imageData[3] / 255})`;

            const colorCanvas = document.createElement('canvas');
            const colorCtx = colorCanvas.getContext('2d', {
                willReadFrequently: true
            });

            // Set your original image dimensions
            colorCanvas.width = imgElement.width;
            // Keep the canvas height fixed
            colorCanvas.height = imgElement.height; // Fixed height

            const marginSize = 40; // Adjust this value to change the thickness of the margins
            const decorationWidth = marginSize * 2; // Width for the decorations

            // Calculate the top and bottom positions for drawing
            const topPosition = marginSize; // Start drawing after the top margin
            const bottomPosition = colorCanvas.height - marginSize; // Stop drawing before the bottom margin

            // Fill the canvas with the specified color, leaving margins at the top and bottom
            colorCtx.fillStyle = rgbaColor;
            colorCtx.fillRect(0, topPosition, colorCanvas.width, colorCanvas.height - marginSize * 2);

            // Set the margin color to red and fill the top and bottom margins
            colorCtx.fillStyle = getRandomColor(); // Solid red for margins
            colorCtx.fillRect(0, 0, colorCanvas.width, marginSize); // Top margin
            colorCtx.fillRect(0, bottomPosition, colorCanvas.width, marginSize); // Bottom margin
            generateFunDecoration(bottomPosition, marginSize, colorCanvas, colorCtx);
            const jpegDataUrl = colorCanvas.toDataURL('image/webp');
            imgElement.src = jpegDataUrl;
            position = 'left';
            initializeQuill(position, canvasWidth, canvasHeight);
            'left'
            quillLeft.enable(); // Enable editing for the left Quill editor
            if (quillRight) quillRight.enable(false); // Disable editing for the right Quill editor if initialized
        };
    }
}


function getRandomColor() {
    const r = Math.floor(Math.random() * 256); // Random red value
    const g = Math.floor(Math.random() * 256); // Random green value
    const b = Math.floor(Math.random() * 256); // Random blue value
    return `rgba(${r}, ${g}, ${b}, 1)`; // Return random color
}

function generateFunDecoration(bottomPosition, marginSize, colorCanvas, colorCtx) {
    const decorationY = bottomPosition - marginSize;

    // Randomly generate stars with sparkle effect
    const numStars = Math.floor(Math.random() * 5) + 10; // 10 to 15 stars
    for (let i = 0; i < numStars; i++) {
        const x = Math.random() * colorCanvas.width;
        const size = Math.random() * 20 + 15; // Size between 15 and 35
        const opacity = Math.random() * 0.5 + 0.5; // Soft shimmer effect
        const color = `rgba(255, ${Math.floor(Math.random() * 200 + 55)}, 50, ${opacity})`;

        drawStar(colorCtx, x, decorationY, size, color);
    }

    // Generate colorful balloons with strings
    const numBalloons = Math.floor(Math.random() * 5) + 8; // 8 to 13 balloons
    for (let i = 0; i < numBalloons; i++) {
        const x = Math.random() * colorCanvas.width;
        const height = Math.random() * 40 + 60; // Height between 60 and 100
        const width = Math.random() * 20 + 30; // Width between 30 and 50
        const color = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 100)}, ${Math.floor(Math.random() * 256)}, 0.9)`;

        drawBalloon(colorCtx, x, decorationY, width, height, color);
        drawBalloonString(colorCtx, x + width / 2, decorationY + height); // Adds a string to each balloon
    }

    // Generate soft clouds for a whimsical feel
    const numClouds = Math.floor(Math.random() * 3) + 3; // 3 to 5 clouds
    for (let i = 0; i < numClouds; i++) {
        const x = Math.random() * colorCanvas.width;
        const y = Math.random() * 50 + decorationY - 50; // Positioned slightly above decorationY
        const size = Math.random() * 50 + 50; // Cloud size between 50 and 100
        drawCloud(colorCtx, x, y, size);
    }

    // Generate confetti for extra celebration
    const numConfetti = Math.floor(Math.random() * 20) + 20; // 20 to 40 pieces of confetti
    for (let i = 0; i < numConfetti; i++) {
        const x = Math.random() * colorCanvas.width;
        const y = decorationY - Math.random() * 50;
        const size = Math.random() * 5 + 5; // Small confetti size
        const color = `rgba(${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, ${Math.floor(Math.random() * 256)}, 1)`;

        drawConfetti(colorCtx, x, y, size, color);
    }
}

// Draw functions for each element
function drawStar(ctx, x, y, size, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.moveTo(x, y);
    for (let i = 0; i < 5; i++) {
        ctx.lineTo(x + size * Math.cos((18 + i * 72) * Math.PI / 180), y - size * Math.sin((18 + i * 72) * Math.PI / 180));
        ctx.lineTo(x + (size / 2) * Math.cos((54 + i * 72) * Math.PI / 180), y - (size / 2) * Math.sin((54 + i * 72) * Math.PI / 180));
    }
    ctx.closePath();
    ctx.fill();
}

function drawBalloon(ctx, x, y, width, height, color) {
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.ellipse(x, y, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
}

function drawBalloonString(ctx, x, y) {
    ctx.beginPath();
    ctx.strokeStyle = '#555';
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + 20);
    ctx.stroke();
}

function drawCloud(ctx, x, y, size) {
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.arc(x, y, size * 0.6, 0, Math.PI * 2);
    ctx.arc(x + size * 0.5, y, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x - size * 0.5, y, size * 0.7, 0, Math.PI * 2);
    ctx.arc(x, y - size * 0.3, size * 0.8, 0, Math.PI * 2);
    ctx.fill();
}

function drawConfetti(ctx, x, y, size, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, size, size);
}

function sendTemplateIdToServer(templateId, fileNumber) {
    console.log('Sending template ID to server:');
    console.log('Template ID:', templateId);

    const formData = new FormData();
    formData.append('templateId', templateId);
    formData.append('fileNumber', fileNumber);
    fetch('http://127.0.0.1:5000/save-image', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            console.log('Response Status:', response.status); // Log status
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text)
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Success:', data);
        })
        .catch((error) => {
            console.error('Error:', error);
        });
}




function saveImageDataAndText(jpegDataUrl, textAreaObject) {
    const formData = new FormData();

    // Update the textAreaObject with the content from the textarea
    alert(colorCanvas);
    // Convert the canvas data URL to a Blob
    jpegDataUrl = colorCanvas.toDataURL('image/webp');
    const imageBlob = dataURLToBlob(jpegDataUrl);

    // Append the image file and text area data to the form
    formData.append('imageFile', imageBlob, '2.webp'); // Customize the filename as needed
    formData.append('textAreaData', JSON.stringify(textAreaObject)); // Send the entire textAreaObject as JSON

    fetch('http://127.0.0.1:5000/save-data', {
            method: 'POST',
            body: formData,
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => {
                    throw new Error(text)
                });
            }
            return response.json();
        })
        .then(data => {
            console.log('Data saved successfully:', data);
        })
        .catch(error => {
            console.error('Error saving data:', error);
        });
}


// Helper function to convert dataURL to Blob
function dataURLToBlob(jpegDataUrl) {

    const parts = jpegDataUrl.split(',');
    const byteString = atob(parts[1]);
    const mimeString = parts[0].split(':')[1].split(';')[0];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);

    for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
    }

    return new Blob([arrayBuffer], {
        type: mimeString
    });
}

function toggleSpeechRecognition(quill) {
    if (!annyang) {
        alert("Speech Recognition is not supported in this browser.");
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
        changePage(PAGE + 1);


    } else {
        changePage(PAGE + 1);
    }
}

function goPreviousPage() {
    if (UCONFIG.doublePage) {
        changePage(PAGE - 1);
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
        const pos = getPosCookie(TITLE);

        // If a page is indicated in the GET
        if (!Number.isNaN(paramPage)) {
            newPage = paramPage;
            // If a chapter is indicated in the GET
        } else if (pos != undefined && pos[VOLUME] != undefined) {
            newPage = pos[VOLUME];
            // Else open the first page
        } else {
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

        /* Load the current page*/
        {

            const leftPageURL = infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE, TCONFIG.fileExtension);

            if (UCONFIG.doublePage) {

                const rightPageURL = infoToImageURL(LIBRARY, TITLE, VOLUME, PAGE + 1, TCONFIG.fileExtension);

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
            if (actionType == "clickMiddle") {
                toggleNavMenu();

            } else {

                toggleNavMenu();
            }
        });
        document.getElementsByClassName("zoom")[0].click();


        pageWidthSlider.oninput = function() {
            UCONFIG.pageWidthSlider = pageWidthSlider.value;
            refreshLayoutNavImage();
        }


        /* -------------------------- FOR CONTINUOUS SCROLLING MODE ONLY ------------------------------------*/
    } else {

        toggleHandlerElement("paperTextureButton", "continuousScrolling_paperTexture", ["paperTextureButton", "paperTexture"], ["enabled", "enabled"]);
        toggleHandlerElement("bookShadowButton", "continuousScrolling_bookShadow", ["bookShadowButton", "navImage"], ["enabled", "bookShadow"]);

        pageWidthSlider.oninput = function() {
            UCONFIG.pageWidthSlider = pageWidthSlider.value;
            document.getElementById("continuousScrollingPages").style.width = UCONFIG.pageWidthSlider + "vw";
        }

        document.getElementById("navImageContainer").onclick = function() {
            toggleNavMenu();

        }

        {
            document.getElementsByTagName('body')[0].classList.add("continuousScrolling");
            imgPageLeft.style.display = "none";
            imgPageRight.style.display = "none";
            sliderContainer.style.display = "none";
            document.getElementById("continuousScrollingPages").style.width = pageWidthSlider.value + "vw";
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

    /* Populate the chapterSelection menu with the chapter from this title */
    // const currentChapterSelection = chapterSelection.selectedIndex;
    //chapterSelection.innerHTML = "";
    // for (let i = 0; i < getChapterCount(); i++) {
    // const option = document.createElement("option");
    // option.text = LCONFIG.readPage.chapter + " " + (i + 1).toString();
    // chapterSelection.add(option);
    //}
    //chapterSelection.selectedIndex = currentChapterSelection;

    // Refresh the book info at the top
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