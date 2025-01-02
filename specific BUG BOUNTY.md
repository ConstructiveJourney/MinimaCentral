As of January 2nd, 2025, there is an identified uncorrected bug.

Intermittently, a call to MDS returns a blank array, e.g. when calling window.MDS.cmd("balance", function (balance) {}) in App.jsx.

The app attempts to resolve this by waiting for the next block and trying a balance command, however, this may then fail again and, in any case, the workaround complicates the code.

The error may well be in the MDS file, or indeed in however MDS gets the information.  The MDS file is included in the public folder, but in fact this is overridden by the Minima Global software and a version is pulled from elsewhere, in a mechanic not yet fully understood by the MinimaCentral team.

We offer a small bounty of 1,000 MINIMA for correct specification of how to fix this (no workarounds please), irrespective of whether in the MinimaCentral or Minima Global code.  If in the Minima Global code, it is conditional on them applying the fix.  NB Minima Global may also have its own bug bounty programme, in addition.

We will be pleased to learn of any other bugs, but for help with those we offer only our gratitude and admiration.

With thanks.