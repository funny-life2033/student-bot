var script = document.createElement("script");
script.src = chrome.runtime.getURL("inject.js");
(document.head || document.documentElement).appendChild(script);

document.body.insertAdjacentHTML(
  "beforeend",
  `
<div
  class="student-bot"
  id="student-bot"
  is-working
>
  <div id="bot-management">
    <button id="start-btn">Start</button>
    <button id="stop-btn">Stop</button>
  </div>
  <div id="bot-account-container">
    <form id="bot-account">
      <input type="text" placeholder="Username" id="username" name="username" />
      <button type="submit">Connect</button>
    </form>
    <div id="connect-error">error</div>
  </div>
  <div id="connecting">Connecting to Server</div>
</div>
`
);

const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

const sleepBetweenSearches = async () => {
  const array = [1, 3, 5, 7, 9];
  // const array = [4, 5, 9, 14, 23, 37];
  let time = array[Math.floor(Math.random() * array.length)];
  await sleep(time * 60000);
};

const setValue = (element, value) => {
  if (element.value === value) return;
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

async function updateState() {
  let isBreakNeeded = false;
  while (true) {
    let isFinished = false;
    chrome.runtime.sendMessage({ getState: true }, async (res) => {
      // console.log("state: ", res);

      if (res.isWorking) {
        if (!isBreakNeeded) {
          const block = async function () {
            if (res.isCredentialChanged) {
              window.location.href = "https://www.gov.uk/book-driving-test";
              isBreakNeeded = true;
              return;
            }

            if (
              window.location.href === "https://www.gov.uk/book-driving-test" ||
              window.location.href === "https://www.gov.uk/change-driving-test"
            ) {
              let startBtn = document.querySelector(
                ".gem-c-button.govuk-button.govuk-button--start"
              );
              if (startBtn) {
                await sleep(2000);
                startBtn.click();
                isBreakNeeded = true;
                return;
              }
            } else if (
              window.location.origin ===
              "https://driverpracticaltest.dvsa.gov.uk"
            ) {
              let iframe = document.getElementById("main-iframe");
              if (iframe) {
                if (
                  iframe.contentDocument.querySelector(
                    'div[aria-label="Click to verify"]'
                  )
                ) {
                  console.log("verify is needed");
                  chrome.runtime.sendMessage({ verifyIsNeeded: true });
                  isBreakNeeded = true;
                  return;
                }

                let errorTitle = iframe.contentDocument.querySelector(
                  "div.error-description div.error-title"
                );
                if (errorTitle && errorTitle.innerText === "Access denied") {
                  chrome.runtime.sendMessage({ accessDenied: true });
                  isBreakNeeded = true;
                  return;
                }
              }

              let errors = document.querySelectorAll(
                "main#main section section.error-summary.formatting ul li"
              );
              for (let err of errors) {
                // console.log("error: ", err);
                if (
                  err.innerText ===
                  "Records show you already have a booking for this type of test. To check or change an existing booking please click here"
                ) {
                  await sleep(2000);
                  err.querySelector("a").click();
                  isBreakNeeded = true;
                  return;
                } else if (
                  res.isEnteredCredential &&
                  (err.innerText ===
                    "The theory test number you have entered is not valid. Please try again." ||
                    err.innerText ===
                      "The driving test reference number you have entered is not valid. Please try again." ||
                    err.innerText ===
                      "A booking can’t be found for the details you have given, please check the details and try again.")
                ) {
                  chrome.runtime.sendMessage({ wrongCredential: true });
                  // isBreakNeeded = true;
                  return;
                } else if (
                  err.innerText ===
                    "No test centre offering car tests can be found using the details entered. Please try again" &&
                  !res.isWrongTestCentreAlerted
                ) {
                  chrome.runtime.sendMessage({ noTestCentre: true });
                  // return;
                }
              }

              if (window.location.pathname === "/application") {
                let unavailableHeader = document.getElementById(
                  "unavailability-notice-title"
                );
                if (
                  unavailableHeader &&
                  unavailableHeader.innerText ===
                    "Sorry, you can’t use this service right now"
                ) {
                  let now = new Date();
                  if (now.getHours() >= 6 && now.getHours() <= 23) {
                    window.location.href =
                      "https://driverpracticaltest.dvsa.gov.uk/application";
                  }
                }

                let carBtn = document.getElementById("test-type-car");
                if (carBtn) {
                  await sleep(2000);
                  carBtn.click();
                  isBreakNeeded = true;
                  return;
                }

                let drivingLicenseInput =
                  document.getElementById("driving-licence");
                if (drivingLicenseInput) {
                  await sleep(1000);

                  setValue(
                    drivingLicenseInput,
                    res.credential.drivingLicenseNumber
                  );

                  await sleep(2000);
                  document.getElementById("special-needs-none").click();

                  async function submit() {
                    while (true) {
                      let submitBtn = document.getElementById(
                        "driving-licence-submit"
                      );
                      if (submitBtn.classList.contains("button-lookdisabled")) {
                        await sleep(10);
                      } else {
                        await sleep(2000);
                        submitBtn.click();
                        isBreakNeeded = true;
                        break;
                      }
                    }
                  }
                  await submit();
                  return;
                }

                let dateEl = document.getElementById(
                  "test-choice-calendar-button"
                );
                if (dateEl) {
                  await sleep(2000);
                  dateEl.click();

                  await sleep(1000);

                  while (true) {
                    let todayEl = document.querySelector(
                      "#ui-datepicker-div table tbody .ui-datepicker-today"
                    );
                    if (todayEl) {
                      todayEl.click();
                      break;
                    }
                    await sleep(40);
                  }

                  await sleep(2000);
                  document.getElementById("driving-licence-submit").click();
                  isBreakNeeded = true;
                  return;
                }

                let testCentreEl =
                  document.getElementById("test-centres-input");
                if (testCentreEl) {
                  let searchResult = document.getElementById("search-results");
                  if (searchResult && !res.isTestCentreChanged) {
                    let centre = searchResult.querySelector(
                      "ul.test-centre-results li.clear a.test-centre-details-link"
                    );
                    await sleep(2000);

                    centre.click();
                    isBreakNeeded = true;
                    return;
                  } else {
                    await sleep(1000);
                    setValue(testCentreEl, res.credential.testCentre);
                    chrome.runtime.sendMessage({ reenteredTestCentre: true });
                    await sleep(2000);

                    document.getElementById("test-centres-submit").click();
                  }
                  isBreakNeeded = true;
                  return;
                }

                let chosenTestCentreEl =
                  document.getElementById("chosen-test-centre");
                if (chosenTestCentreEl) {
                  let testAvailableEl =
                    document.getElementById("test-availability");
                  if (!testAvailableEl || res.isTestCentreChanged) {
                    await sleepBetweenSearches();

                    chosenTestCentreEl
                      .querySelector("#change-test-centre")
                      .click();
                    isBreakNeeded = true;
                    return;
                  } else {
                    if (res.bookSlot) {
                      let availableDateEls = testAvailableEl.querySelectorAll(
                        "#slot-picker-form .SlotPicker .BookingCalendar .BookingCalendar-mask table.BookingCalendar-dates tbody.BookingCalendar-datesBody tr td.BookingCalendar-date--bookable a.BookingCalendar-dateLink"
                      );
                      let bookDate = new Date(res.bookSlot.date);

                      for (let availableDateEl of availableDateEls) {
                        let date = new Date(
                          availableDateEl.getAttribute("data-date")
                        );

                        if (
                          date.getFullYear() === bookDate.getFullYear() &&
                          date.getMonth() === bookDate.getMonth() &&
                          date.getDate() === bookDate.getDate()
                        ) {
                          availableDateEl.click();

                          let timePicker = document.querySelector(
                            ".SlotPicker-timeSlots"
                          );
                          console.log("timePicker: ", timePicker);
                          while (!timePicker.classList.contains("is-active")) {
                            await sleep(40);
                          }

                          let availableDates = testAvailableEl.querySelectorAll(
                            "#slot-picker-form .SlotPicker .SlotPicker-timeSlots li.SlotPicker-day[id]"
                          );

                          for (let el of availableDates) {
                            if (
                              new Date(
                                el.querySelector(
                                  "p.SlotPicker-dayTitle"
                                ).innerText
                              ) -
                                bookDate ===
                              0
                            ) {
                              let timeEls = el.querySelectorAll("label");

                              for (let timeEl of timeEls) {
                                if (
                                  timeEl.querySelector("strong.SlotPicker-time")
                                    .innerText === res.bookSlot.time
                                ) {
                                  timeEl.click();
                                  break;
                                }
                              }
                              break;
                            }
                          }

                          let continueBtn =
                            document.getElementById("slot-chosen-submit");
                          while (
                            continueBtn.classList.contains(
                              "button-lookdisabled"
                            )
                          ) {
                            await sleep(40);
                          }
                          continueBtn.click();

                          let confirmDialog =
                            document.querySelector(".underlay-wrapper");
                          while (
                            getComputedStyle(confirmDialog).display === "none"
                          ) {
                            await sleep(40);
                          }
                          document
                            .getElementById("slot-warning-continue")
                            .click();
                          isBreakNeeded = true;
                          return;
                        }
                      }

                      // } else {
                      //   document.querySelector(
                      //     "div.form-block.contextual-help a.more"
                      //   );
                      // }
                    } else {
                      let availableDateEls = testAvailableEl.querySelectorAll(
                        "#slot-picker-form .SlotPicker .SlotPicker-timeSlots li.SlotPicker-day[id]"
                      );

                      let availableDates = [];

                      for (let availableDateEl of availableDateEls) {
                        let dateStr = availableDateEl.querySelector(
                          "p.SlotPicker-dayTitle"
                        ).innerText;
                        let date = new Date(dateStr);
                        const now = new Date();

                        if (
                          // true
                          date <
                          new Date(
                            now.getFullYear(),
                            now.getMonth() + 2,
                            now.getDate()
                          )
                        ) {
                          let timeEls =
                            availableDateEl.querySelectorAll("label");

                          let times = [];
                          for (let el of timeEls) {
                            times.push({
                              time: el.querySelector("strong.SlotPicker-time")
                                .innerText,
                              price: el.querySelector("span.SlotPicker-price")
                                .innerText,
                            });
                          }
                          availableDates.push({ date: dateStr, times });
                        } else {
                          break;
                        }
                      }

                      if (
                        JSON.stringify(availableDates) !==
                        JSON.stringify(res.availableDates)
                      ) {
                        chrome.runtime.sendMessage({ availableDates });
                        console.log("availableDates: ", availableDates);
                      }

                      if (!availableDates.length) {
                        await sleepBetweenSearches();

                        chosenTestCentreEl
                          .querySelector("#change-test-centre")
                          .click();
                        isBreakNeeded = true;
                        return;
                      }
                      return;
                    }
                  }
                }

                let candidateDetailInput = document.getElementById(
                  "candidate-details-form"
                );
                if (candidateDetailInput) {
                  chrome.runtime.sendMessage({ candidateDetailRequired: true });
                  isBreakNeeded = true;
                  return;
                }
              } else if (window.location.pathname === "/login") {
                if (res.isEnteredCredential) {
                  chrome.runtime.sendMessage({ enterCredential: true });
                } else {
                  let drivingLicenseInput = document.getElementById(
                    "driving-licence-number"
                  );
                  if (drivingLicenseInput) {
                    setValue(
                      drivingLicenseInput,
                      res.credential.drivingLicenseNumber
                    );

                    if (res.credential.drivingTestReferenceNumber) {
                      setValue(
                        document.getElementById("application-reference-number"),
                        res.credential.drivingTestReferenceNumber
                      );
                    } else if (res.credential.theoryTestPassNumber) {
                      setValue(
                        document.getElementById("theory-test-pass-number"),
                        res.credential.theoryTestPassNumber
                      );
                    } else {
                      chrome.runtime.sendMessage({ wrongCredential: true });
                      // isBreakNeeded;
                      return;
                    }

                    await sleep(100);
                    chrome.runtime.sendMessage({ enteredCredential: true });
                    localStorage.setItem("is entered credential", "true");
                    isBreakNeeded = true;
                    document.getElementById("booking-login").click();
                  }
                }
              } else if (window.location.pathname === "/application/timeout") {
                await sleep(1000);
                window.location.href =
                  "https://www.gov.uk/book-practical-driving-test";
              }
            }
          };

          await block();
        }
      } else {
        isBreakNeeded = false;
      }

      isFinished = true;
    });

    while (!isFinished) {
      await sleep(40);
    }
    await sleep(40);
  }
}

async function updateUI() {
  while (true) {
    chrome.runtime.sendMessage({ getState: true }, async (res) => {
      if (res.isConnecting) {
        document
          .querySelector("#student-bot #connecting")
          .removeAttribute("hidden");
        document
          .querySelector("#student-bot #bot-account-container")
          .setAttribute("hidden", "true");

        document.querySelector(
          "#student-bot #connecting"
        ).innerHTML = `Connecting to server`;
      } else if (res.username) {
        document
          .querySelector("#student-bot #connecting")
          .removeAttribute("hidden");
        document
          .querySelector("#student-bot #bot-account-container")
          .setAttribute("hidden", "true");

        document.querySelector(
          "#student-bot #connecting"
        ).innerHTML = `Connected as ${res.username}`;
      } else {
        document
          .querySelector("#student-bot #connecting")
          .setAttribute("hidden", "true");
        document
          .querySelector("#student-bot #bot-account-container")
          .removeAttribute("hidden");

        setError(res.connectError);
      }

      if (res.isWorking) {
        document
          .getElementById("student-bot")
          .setAttribute("is-working", "true");
      } else {
        document.getElementById("student-bot").removeAttribute("is-working");
      }
    });

    await sleep(40);
  }
}

function setError(error) {
  document.querySelector("#student-bot #connect-error").innerHTML = error
    ? error
    : "";
}

updateState();
updateUI();

document
  .querySelector("#student-bot #start-btn")
  .addEventListener("click", () => {
    chrome.runtime.sendMessage({ start: true }, (res) => {
      if (res.error) {
        alert(res.error);
      }
    });
  });

document
  .querySelector("#student-bot #stop-btn")
  .addEventListener("click", () => {
    chrome.runtime.sendMessage({ stop: true }, ({ success }) => {
      if (success) {
        document.getElementById("student-bot").removeAttribute("is-working");
      }
    });
  });

document
  .querySelector("#student-bot #bot-account")
  .addEventListener("submit", (e) => {
    e.preventDefault();

    const username = document.querySelector("#student-bot #username").value;

    if (username && username !== "") {
      try {
        chrome.runtime.sendMessage({ connect: true, username });
      } catch (error) {
        setError("Refresh the page and try again.");
      }
    } else {
      setError("Username is required");
    }
  });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.start) {
    // window.location.href = "https://www.gov.uk/book-driving-test";
  }
});
