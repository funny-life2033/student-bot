(function () {
  console.log("injected");
})();

const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const setValue = (element, value) => {
  // element.focus();
  // document.execCommand("insertText", false, value);

  const keyboardEventInit = {
    bubbles: false,
    cancelable: false,
    composed: false,
    key: "",
    code: "",
    location: 0,
  };
  element.focus();
  element.setSelectionRange(0, 0);
  element.dispatchEvent(new KeyboardEvent("keydown", keyboardEventInit));
  element.value = value;
  element.dispatchEvent(new KeyboardEvent("keyup", keyboardEventInit));
  element.dispatchEvent(new Event("change", { bubbles: true }));

  // element.focus();
  // element.setSelectionRange(value.length, value.length);
};

// setValue(document.getElementById("driving-licence-number"), "HUSSA059113M99KJ");
// setValue(document.getElementById("theory-test-pass-number"), "234856480");
