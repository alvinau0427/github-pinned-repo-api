function getCookie(name) {
  var nameEQ = name + "=";
  var ca = document.cookie.split(';');
  for(var i = 0; i < ca.length; i++) {
    var c = ca[i];
    while (c.charAt(0) == ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

function eraseCookie(name) {   
  document.cookie = name+'=; Max-Age=-99999999;';  
}

function inputOnFocus(target) {
  target.parentElement.classList.add('active');
}

function inputOnBlur(target) {
  if (target.value.length == 0) {
    target.parentElement.classList.remove('active');
  }
}

function formOnSubmit() {
  document.getElementById('spinner').classList.add('show');
  document.getElementById('overlay').classList.add('show');

  let nextPageCookie = getCookie("nextPage");
  if (nextPageCookie) {
    document.getElementById('spinner').classList.add('show');
    document.getElementById('overlay').classList.add('remove');
    eraseCookie('nextPage');
  }
}
