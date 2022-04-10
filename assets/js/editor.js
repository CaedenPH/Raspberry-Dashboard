document.addEventListener('DOMContentLoaded', function() {
  const editor = document.getElementById('editor');

  editor.value = "";
    document.getElementsByTagName('form')[0].onsubmit = function(evt) {
      evt.preventDefault(); // Preventing the form from submitting
      checkWord(); // Do your magic and check the entered word/sentence
      window.scrollTo(0,150);
    }
   
    // Get the focus to the text input to enter a word right away.
    document.getElementById('editorTextInput').focus();
   
    // Getting the text from the input
    var textInputValue = document.getElementById('editorTextInput').value.trim();
   
    //Getting the text from the results div
    var textResultsValue = document.getElementById('editorResultsCont').innerHTML;
    
    // Clear text input
    var clearInput = function(){
      document.getElementById('editorTextInput').value = "";
    }
  
    // Scrtoll to the bottom of the results div 
    var scrollToBottomOfResults = function(){
      var editorResultsDiv = document.getElementById('editorResultsCont');
      editorResultsDiv.scrollTop = editorResultsDiv.scrollHeight;
    }
   
    // Scroll to the bottom of the results
    scrollToBottomOfResults();
   
    // Add text to the results div
    var checkWord = async() => {
        textInputValue = document.getElementById('editorTextInput').value.trim();
        
        let file = await fetch("/execute?cmd=cat " + textInputValue, {
            method: "GET"
        });
        fileContents = (await file.json()).message
        if (fileContents.includes("No such file")) {
            clearInput();
        } else {
          editor.value = fileContents;
          document.getElementById("saveButton").onclick = async() => {
            await fetch("/execute?cmd=mv " + textInputValue + " tmp", {
              method: "GET"
            });
            await fetch(`/execute?cmd=echo ${editor.value} >> ${textInputValue}`, {
              method: "GET"
            });
            editor.value = "";
            clearInput();
          }
        }
  
      
    };
   
  });