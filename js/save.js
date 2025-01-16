
import {
    findGetParameter,
    
} from './tools.js';
function saveBook() {
    // Replace with actual dynamic values for bookName and userID
    const bookName = "firstbook"; 
    const userId = findGetParameter('userId');

    alert(userId);

    // Create FormData and append parameters
    const formData = new FormData();
    formData.append("userID", userId);
    formData.append("bookName", bookName);

    // API call with FormData
    fetch('http://localhost:8080/api/book-infos', {
        method: 'POST',
        body: formData,
    })
        .then(response => {
            if (response.ok) {
                return response.json();
            }
            throw new Error('Failed to save book');
        })
        .then(data => {
            console.log('Book saved successfully:', data);
            alert('Book saved successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error saving the book');
        });
}
function updateBookInfo() {
    // Replace with actual dynamic values for bookName and userID
    const bookName = "firstbook"; 
    const userId = findGetParameter('userId');

    alert(userId);

    // Create FormData and append parameters
    const formData = new FormData();
    formData.append("userID", userId);
    formData.append("bookName", bookName);

    // API call with FormData
    fetch('http://localhost:8080/api/book-infos/{userId}', {
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
            console.log('Book saved successfully:', data);
            alert('Book saved successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error saving the book');
        });
}