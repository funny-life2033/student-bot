let isWorking = false;
let socket;
let username;
let credential;
let isConnecting = false;
let connectError;
let isEnteredCredential = false;
let isWrongTestCentreAlerted = false;
let availableDates = [];
let bookSlot;
let isCredentialChanged = false;
let isTestCentreChanged = false;

const sleep = (time) => {
  return new Promise((resolve) => setTimeout(resolve, time));
};

function socketHandle() {
  socket = io("ws://student-bot-backend.onrender.com/");

  socket.on("connect", async () => {
    console.log("connected to server");

    if (username) {
      socket.emit("student bot connect", username);
      isConnecting = true;
      connectError = null;
    }
  });

  socket.on("student bot connect failed", async (error) => {
    isConnecting = false;
    username = null;
    credential = null;
    isWorking = false;
    //   setUsername(null);
    connectError = error;
  });

  socket.on("student bot connect success", (detail) => {
    console.log("student bot connect success: ", detail);
    isConnecting = false;
    username = detail.username;
    connectError = null;

    if (credential) {
      const {
        drivingLicenseNumber,
        drivingTestReferenceNumber,
        theoryTestPassNumber,
        testCentre,
      } = credential;

      credential = detail.credential;

      if (
        drivingLicenseNumber !== credential.drivingLicenseNumber ||
        drivingTestReferenceNumber !== credential.drivingTestReferenceNumber ||
        (drivingTestReferenceNumber === credential.drivingTestReferenceNumber &&
          theoryTestPassNumber !== credential.theoryTestPassNumber)
      ) {
        isCredentialChanged = true;
      }

      if (testCentre !== credential.testCentre) {
        isTestCentreChanged = true;
      }
    } else {
      credential = detail.credential;
    }

    socket.emit("is working", isWorking);
    // setUsername(username);
    // setCredential(credential);
  });

  socket.on("agent connect", () => {
    console.log("agent connect");
    socket.emit("is working", isWorking);
  });

  socket.on("student client connect", () => {
    console.log("student client connect");
    socket.emit("is working", isWorking);
    if (availableDates.length) {
      socket.emit("available dates", availableDates);
    }
  });

  socket.on("disconnect", (e) => {
    console.log("disconnected: ", e);
  });

  socket.on("agent disconnect", () => {
    console.log("agent disconnect");
  });

  socket.on("student bot start", function () {
    console.log("student bot start");
    availableDates = [];

    if (!credential) {
      socket.emit("student bot start failed", "credential is needed");
      // gotoNextStep();
    } else {
      isWorking = true;
      socket.emit("student bot started");
    }
    // console.log(taskList);
  });

  socket.on("student bot stop", () => {
    console.log("student bot stop");

    isWorking = false;
    socket.emit("student bot stopped");
  });

  socket.on("entered credential", async (_) => {
    console.log("entered credential: ", _);

    if (credential) {
      const {
        drivingLicenseNumber,
        drivingTestReferenceNumber,
        theoryTestPassNumber,
        testCentre,
      } = credential;

      credential = _;

      if (
        drivingLicenseNumber !== credential.drivingLicenseNumber ||
        drivingTestReferenceNumber !== credential.drivingTestReferenceNumber ||
        (drivingTestReferenceNumber === credential.drivingTestReferenceNumber &&
          theoryTestPassNumber !== credential.theoryTestPassNumber)
      ) {
        isCredentialChanged = true;
      }

      if (testCentre !== credential.testCentre) {
        isTestCentreChanged = true;
      }
    } else {
      credential = _;
    }

    //   setCredential(credential);
  });

  socket.on("student accept slot", (slot) => {
    console.log("student accept slot: ", slot);
    bookSlot = slot;
  });
}

socketHandle();

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.getState) {
    // let username = await getUsername();
    // console.log(username);

    sendResponse({
      isWorking,
      isConnecting,
      username,
      credential,
      connectError,
      isEnteredCredential,
      isWrongTestCentreAlerted,
      availableDates,
      bookSlot,
      isCredentialChanged,
      isTestCentreChanged,
    });

    isCredentialChanged = false;
    isTestCentreChanged = false;
  } else if (request.start) {
    availableDates = [];

    if (!credential) {
      sendResponse({ error: "Credential is not entered" });
      // gotoNextStep();
    } else {
      isWorking = true;
      socket.emit("student bot started");
      sendResponse({ message: "success" });
    }
  } else if (request.stop) {
    isWorking = false;
    socket.emit("student bot stopped");
    sendResponse({ success: true });
  } else if (request.connect) {
    socket.emit("student bot connect", request.username);
    isConnecting = true;
    connectError = null;
  } else if (request.verifyIsNeeded) {
    socket.emit("error alert", "verify is needed");
  } else if (request.accessDenied) {
    isWorking = false;
    socket.emit("is working", isWorking);
    socket.emit("error alert", "Access Denied");
  } else if (request.wrongCredential) {
    isWorking = false;
    isEnteredCredential = false;
    socket.emit("wrong credential");
  } else if (request.availableDates) {
    availableDates = request.availableDates;
    socket.emit("available dates", request.availableDates);
  } else if (request.enteredCredential) {
    isEnteredCredential = true;
  } else if (request.enterCredential) {
    isEnteredCredential = false;
  } else if (request.noTestCentre) {
    isWorking = false;
    isEnteredCredential = false;
    isWrongTestCentreAlerted = true;
    socket.emit("no test centre");
  } else if (request.reenteredTestCentre) {
    isWrongTestCentreAlerted = false;
  } else if (request.candidateDetailRequired) {
    socket.emit("candidate detail required");
    bookSlot = null;
  }
});
