# Introducing roles to Hangbank
### Corpus
* Corpus entity
* Corpus Visibility (-> Corpus)
* User-Corpus Access
    * The user has access to *that* specific corpus with *this* specific role type
    * This value is only checked if the corpus is protected. If it is public, there's no need to check, if it's private, it is not visible, just for the owner
* User-Corpus Access Type
    * -O-W-N-E-R- (no need)
    * CONTRIBUTOR
    * VIEWER (who can also export the dataset too..)

Affected services:
* CREATE (add the owner as role? NO NEED, just set the corpus' uploader parameter!)
* MODIFY/DELETE (allowed only for owner)
* Save recording? (only for at least contributors)
* Export (only for at least viewers)