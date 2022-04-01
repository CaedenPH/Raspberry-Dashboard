document.addEventListener('DOMContentLoaded', function() {
 
  document.getElementsByTagName('form')[0].onsubmit = function(evt) {
    evt.preventDefault(); // Preventing the form from submitting
    checkWord(); // Do your magic and check the entered word/sentence
    window.scrollTo(0,150);
  }
 
  // Get the focus to the text input to enter a word right away.
  document.getElementById('terminalTextInput').focus();
 
  // Getting the text from the input
  var textInputValue = document.getElementById('terminalTextInput').value.trim();
 
  //Getting the text from the results div
  var textResultsValue = document.getElementById('terminalReslutsCont').innerHTML;
  
  // Clear text input
  var clearInput = function(){
    document.getElementById('terminalTextInput').value = "";
  }

  // Scrtoll to the bottom of the results div
  var scrollToBottomOfResults = function(){
    var terminalResultsDiv = document.getElementById('terminalReslutsCont');
    terminalResultsDiv.scrollTop = terminalResultsDiv.scrollHeight;
  }
 
  // Scroll to the bottom of the results
  scrollToBottomOfResults();
 
  // Add text to the results div
  var addTextToResults = function(textToAdd){
    document.getElementById('terminalReslutsCont').innerHTML += "<p>" + textToAdd + "</p>";
    scrollToBottomOfResults();
  }
 
 
  var checkWord = async() => {
    textInputValue = document.getElementById('terminalTextInput').value.trim();
    textInputValueLowerCase = textInputValue.toLowerCase();
    console.log(textInputValueLowerCase)
 
    if (textInputValue != ""){
      addTextToResults("<p class='userEnteredText'>> " + textInputValue + "</p>");
      output = await fetch("/execute?cmd=" + textInputValue, {
          method: "GET"
      });
      var msg = (await output.json()).message.trim()
      console.log(msg);
      if ( msg.endsWith("found") ) {
        msg = "Command " + textInputValue + " not found"
      }
      addTextToResults("<i>" + msg.replaceAll("\n", "<br>") + "<b>")
      clearInput();
    }
  };
 
});