Goal: user ability to request language support for UI

Plan:
* User calls backend 
* Bakend:
    * Checks if there is a translated language for this purpose already (in db, isTranslated flag)
    * If not: translates /en/common.json via a small local LLM
    * ...
        * option A: writes the result file dynamically in the client side's project...?
        * option B: use an s3 bucket to read the common.json files (and upload results there)
        * option C: send to the client back via HTTP to...?
        * ...
