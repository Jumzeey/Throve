# SCREENS.md

## Throve Prototype Screen Specification

**Document status:** Final  
**Last updated:** 8 August 2026  
**Platform:** One shared mobile application for iPhone and Android  
**Initial market:** Nigeria  
**Prototype payments:** Simulated only — no real money  
**Live video:** Real live video included  
**Account model:** One account can buy and sell  

**Source basis:** Final `PRODUCT.md` and the approved Throve Prototype Decisions V1 recorded in this project.

---

# Prototype rules

Throve is a mobile-first social fashion and beauty resale marketplace for new, unused and pre-owned items.

The prototype must support:

- One account that can both buy and sell.
- Real user accounts.
- Email magic-link login.
- Email verification.
- Product listings.
- Saved/favourite items.
- Buyer–seller text chat.
- Offers and counter-offers.
- Seller contact with interested buyers.
- Simulated checkout without real money.
- Orders and simulated delivery progress.
- Real live video.
- Live comments.
- Live product presentation and claims.
- Invite-only live hosting.

Public comments are **not** allowed on normal product listings.

The main bottom navigation is:

1. Home
2. Search
3. Sell
4. Inbox
5. Profile

Live shopping is **not** a sixth permanent navigation tab.

Prototype features must be clearly distinguished from production-ready functionality.

---

# Listing status rules

## Available

An Available listing:

- Can be purchased.
- Can receive offers.
- Can be saved.
- Can be discussed with the seller.

## Reserved

A Reserved listing:

- Is temporarily unavailable because another user is completing checkout or has an active live claim.
- Cannot be successfully purchased by another user during the reservation.
- May remain visible on the seller's profile with a clear **Reserved** label.
- Should normally be excluded from general available search results.

For standard checkout, the prototype reservation target is **10 minutes**.

For a live product claim, the prototype claim reservation target is **5 minutes**.

These times may later be adjusted based on prototype testing.

## Sold

A Sold listing:

- Has completed a successful simulated purchase.
- Cannot be purchased again.
- May remain visible on the seller's profile with a clear **Sold** label.
- Should not appear among normal available search results.

## Status changes

Where practical, status changes should happen automatically:

- Checkout starts → **Reserved**
- Checkout expires or is abandoned → **Available**
- Live claim starts → **Reserved**
- Live claim expires → **Available**
- Simulated purchase succeeds → **Sold**

A seller may also manually mark an item as Sold if it was sold outside Throve during the prototype.

Preventing two buyers from successfully obtaining the same unique item is a core prototype requirement.

---

# 1. Welcome and accounts

## Screen 1 — Welcome

### Who uses it
Signed-out users.

### Prototype status
**INCLUDED**

### Purpose
Introduce Throve and give a new or returning user a clear route to create or access an account.

### How the user reaches it
- Opens Throve while signed out.
- Logs out of an existing account.

### What the user sees
- Throve branding.
- A short introduction to Throve.
- Create Account action.
- Log In action.

### What the user can do
- Start Sign Up.
- Go to Log In.

### Where the user can go next
- Screen 2 — Sign Up.
- Screen 3 — Log In.

### Important states
- Default.
- Loading.
- Error if the app cannot initialise.
- Offline/connection problem.

### Definition of done
The screen is complete when a signed-out user can clearly understand the two account-entry choices and successfully open Sign Up or Log In.

---

## Screen 2 — Sign Up

### Who uses it
New users.

### Prototype status
**INCLUDED**

### Purpose
Create a real Throve account using the approved prototype account information.

### How the user reaches it
Screen 1 — Welcome → Create Account.

### What the user sees
Required fields:

- Email address.
- Name.
- Username.
- Date of birth.

The screen must also explain that email verification is required.

Government ID, bank verification and production seller verification are not included.

### What the user can do
- Enter required information.
- Submit registration.
- Open Log In if they already have an account.

### Where the user can go next
- Email verification/magic-link state within the registration flow.
- Screen 5 — Basic Account Setup after successful verification.
- Screen 3 — Log In.

### Important states
- Default.
- Required field missing.
- Invalid email.
- Username unavailable.
- Registration submitting.
- Verification email sent.
- Registration success.
- Error.
- Offline.

### Definition of done
A user can submit the four required fields, receive the prototype email-verification flow and continue to Basic Account Setup after successful verification.

---

## Screen 3 — Log In

### Who uses it
Returning users.

### Prototype status
**INCLUDED**

### Purpose
Allow an existing user to access their Throve account using an email magic link.

### How the user reaches it
- Screen 1 — Welcome → Log In.
- Account Recovery when recovery completes.
- Logout followed by returning to login.

### What the user sees
- Email address field.
- Send Magic Link action.
- Link to Account Recovery.

Apple and Google login are later-version options and are not part of the prototype.

### What the user can do
- Enter an email address.
- Request a magic link.
- Open Account Recovery.

### Where the user can go next
- Screen 6 — Home after successful login.
- Screen 4 — Account Recovery.
- Screen 2 — Sign Up if needed.

### Important states
- Default.
- Magic link sending.
- Magic link sent.
- Invalid or unknown email.
- Link expired or invalid.
- Login success.
- Error.
- Offline.

### Definition of done
A registered user can request and use an email magic link to reach their account, with clear handling for invalid or failed login attempts.

---

## Screen 4 — Account Recovery

### Who uses it
Users who cannot access their existing account.

### Prototype status
**INCLUDED**

### Purpose
Provide a recovery route for an existing Throve account.

### How the user reaches it
Screen 3 — Log In → Account Recovery.

### What the user sees
- An explanation of account recovery.
- The exact recovery mechanism beyond the approved email-based account system is **To be decided**.

### What the user can do
- Begin the approved recovery process once the recovery mechanism is finalised.
- Return to Log In.

### Where the user can go next
- Screen 3 — Log In.
- Recovery success state.

### Important states
- Default.
- Recovery request in progress.
- Recovery instructions sent.
- Account not found.
- Recovery failed.
- Recovery success.
- Offline.

### Definition of done
The screen is complete when the final approved recovery method can restore access to a valid prototype account and failures are clearly explained.

---

## Screen 5 — Basic Account Setup

### Who uses it
Newly registered users.

### Prototype status
**INCLUDED**

### Purpose
Allow a new user to complete a simple profile before entering the main marketplace.

### How the user reaches it
Screen 2 — Sign Up → successful email verification.

### What the user sees
Fields for:

- Profile photograph.
- Username.
- Short bio.
- Location.

The username may already contain the value selected during Sign Up.

### What the user can do
- Add or change a profile photograph.
- Confirm or edit username.
- Add a short bio.
- Add location.
- Continue into Throve.

### Where the user can go next
Screen 6 — Home.

### Important states
- Default.
- Photo uploading.
- Saving.
- Username unavailable.
- Save success.
- Error.
- Offline.

### Definition of done
A newly registered user can complete the approved profile fields and reach Home with the saved information visible on their profile.

---

# 2. Home and discovery

## Screen 6 — Home

### Who uses it
Signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Act as the main discovery screen for products, sellers and live-shopping activity.

### How the user reaches it
- Successful registration and Basic Account Setup.
- Successful login.
- Home tab in bottom navigation.

### What the user sees
The Home experience can include:

- Live Now.
- Upcoming live sessions.
- New listings.
- Marketplace discovery/recommended items.
- Categories.
- Seller discovery where appropriate.

Prototype recommendations may use simple recent, seeded or sample data. An advanced recommendation algorithm is not required.

Bottom navigation:

- Home.
- Search.
- Sell.
- Inbox.
- Profile.

### What the user can do
- Browse products.
- Open a product.
- Save/favourite a product.
- Open Category Browse.
- Open a seller profile.
- Open a Live Now session.
- View an upcoming live session.
- Use bottom navigation.

### Where the user can go next
- Screen 7 — Category Browse.
- Screen 8 — Search / Search Results.
- Screen 9 — Product Details.
- Screen 10 — Seller Profile.
- Screen 27 — Live-Shopping Discovery.
- Screen 28 — Live-Shopping Viewer.
- Screen 11 — Create Listing through Sell.
- Screen 16 — Inbox.
- Screen 32 — My Profile.

### Important states
- Loading.
- No new listings.
- No live sessions.
- No upcoming lives.
- Product-load error.
- Live-content error.
- Offline.
- Available product.
- Reserved product where shown.
- Sold product where seller/social context requires it.

### Definition of done
Home is complete when users can discover products and live activity, open the main marketplace destinations and use the approved five-item bottom navigation without broken routes.

---

## Screen 7 — Category Browse

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Allow users to browse products through the approved marketplace categories.

### How the user reaches it
- Screen 6 — Home → Categories.
- Search/discovery links where appropriate.

### What the user sees
Initial product areas may include:

- Women.
- Men.
- Children.
- Clothes.
- Shoes.
- Bags.
- Accessories.
- Beauty.

The exact hierarchy may be refined during wireframing without changing product scope.

### What the user can do
- Select a category.
- Browse Available listings within it.
- Open a product.
- Move to Search.

### Where the user can go next
- Screen 8 — Search / Search Results.
- Screen 9 — Product Details.
- Screen 6 — Home.

### Important states
- Loading.
- Category has listings.
- Empty category.
- Error.
- Offline.
- Reserved/Sold items normally excluded from available browsing.

### Definition of done
Users can select an approved category and see the appropriate product results, including a clear empty state when no items are available.

---

# 3. Search and filters

## Screen 8 — Search / Search Results

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Allow users to search the marketplace and narrow results using approved filters and sorting.

### How the user reaches it
- Search tab in bottom navigation.
- Home.
- Category Browse.

### What the user sees
Search may cover:

- Products.
- Brands.
- Sellers.
- Categories where appropriate.

Search results display matching products and appropriate seller/category results.

### What the user can do
- Enter or change a search.
- Open a product.
- Open a seller.
- Open Filters and Sorting.
- Clear the search.

### Where the user can go next
- Screen 9 — Product Details.
- Screen 10 — Seller Profile.
- Screen 7 — Category Browse.

### Important states
- Default search.
- Searching.
- Results found.
- No Results.
- Error.
- Offline.
- Available results.
- Reserved items normally excluded from normal available results.
- Sold items excluded from normal available results.

### Filters and Sorting component

Filters and Sorting are **merged into this screen** and are not counted separately.

Approved filters:

- Category.
- Brand.
- Size.
- Condition.
- Price.

Approved sorting:

- Newest.
- Lowest price.
- Highest price.

The component must provide:

- Apply Filters.
- Clear Filters.
- Close.

It may be presented as a bottom sheet, panel, overlay or modal during wireframing.

### Definition of done
Search is complete when users can search approved content, apply and clear the approved filters, change sorting, see a No Results state and open matching products or sellers.

---

# 4. Product details

## Screen 9 — Product Details

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Show the important information about one listing and provide the main buying, saving, offer and seller-contact actions.

### How the user reaches it
- Home.
- Category Browse.
- Search.
- Saved Items.
- Seller Profile.
- My Listings.
- Live-shopping product interaction where appropriate.

### What the user sees
- Up to 8 product photographs.
- Main photograph.
- Item title.
- Price.
- Category.
- Brand if supplied.
- Colour if supplied.
- Size where relevant.
- Condition.
- Description if supplied.
- Shipping notes if supplied.
- Seller information.
- Listing status: Available, Reserved or Sold.
- Saved/favourite state.

There are no public product-listing comments.

### What the user can do

When **Available**:

- Save/favourite.
- Remove from Saved.
- Message seller.
- Open seller profile.
- Make Offer.
- Buy Now.

When **Reserved**:

- View the listing.
- View seller.
- Save if appropriate.
- Message seller.
- Cannot successfully purchase while the reservation is active.

When **Sold**:

- View listing history/details where surfaced.
- View seller.
- Cannot buy or make a new purchase offer.

### Where the user can go next
- Screen 10 — Seller Profile.
- Screen 15 — Saved Items.
- Screen 18 — Offer Details after creating an offer.
- Screen 19 — Chat Conversation.
- Screen 20 — Shipping Details after Buy Now starts checkout.

### Important states
- Loading.
- Error.
- Listing removed/unavailable.
- Available.
- Reserved.
- Sold.
- Save success/failure.
- Buy Now disabled when Reserved or Sold.
- Offer disabled when not eligible.
- Offline.

### Make Offer component

Make Offer is a component/modal rather than a separate numbered screen.

It shows:

- Listing price.
- Offer amount entry.
- Validation that a buyer offer is below listing price.
- Initial lower limit of approximately 50% of listing price.
- Submit.
- Cancel.

No separate offer-message field is included.

### Definition of done
Product Details is complete when a user can understand the listing, its current status and seller, save it, contact the seller, make a valid offer and start checkout only when the item is eligible.

---

# 5. Seller profiles

## Screen 10 — Seller Profile

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Show public seller information, listings and relevant live-shopping activity.

### How the user reaches it
- Product Details.
- Search results.
- Home seller discovery.
- Chat.
- Live-shopping screens.

### What the user sees
A profile may show:

- Profile photograph.
- Username.
- Bio.
- Location.
- Active listings.
- Sold listings.
- Relevant live-shopping activity.
- Live Now or upcoming live information where relevant.

Private information such as email, telephone number and home address is not displayed.

### What the user can do
- View Available listings.
- View Reserved/Sold listings when retained on profile.
- Open a product.
- Message seller.
- Enter an active live session.
- View relevant upcoming live activity.

Following sellers is not an approved prototype feature.

### Where the user can go next
- Screen 9 — Product Details.
- Screen 19 — Chat Conversation.
- Screen 28 — Live-Shopping Viewer.
- Screen 27 — Live-Shopping Discovery.

### Important states
- Loading.
- No active listings.
- No sold listings.
- No live activity.
- Seller currently live.
- Error.
- Offline.

### Definition of done
Seller Profile is complete when approved public profile information, listings and relevant live activity display correctly without exposing private user information.

---

# 6. Create and manage listings

## Screen 11 — Create Listing

### Who uses it
Sellers. Every normal Throve account may sell.

### Prototype status
**INCLUDED**

### Purpose
Allow a user to create a new marketplace listing.

### How the user reaches it
Sell tab in bottom navigation → Create Listing.

Approved live hosts may also see a **Go Live** entry from the Sell area.

### What the user sees
Photo controls:

- Up to 8 photographs.
- First photograph is the main image.
- Photographs can be reordered.

Required fields:

- At least one photograph.
- Item title.
- Category.
- Condition.
- Price.

Size is required where relevant to the product category.

Optional/recommended fields may include:

- Brand.
- Colour.
- Description.
- Size where not applicable.
- Shipping notes.

Condition options:

- New with tags.
- New without tags.
- Very good.
- Good.
- Satisfactory.

Suggested limits:

- Title: 80 characters.
- Description: 1,000 characters.

### What the user can do
- Add photographs.
- Reorder photographs.
- Enter listing information.
- Save as Draft.
- Preview.
- Continue editing.
- Cancel.

### Where the user can go next
- Screen 12 — Listing Preview.
- Screen 13 — My Listings after saving a draft.
- Screen 29 — Live-Hosting Access if a non-approved user chooses Go Live.
- Screen 30 — Prepare / Schedule Live if an approved live host chooses Go Live.

### Important states
- Empty form.
- Partially completed.
- Draft saved.
- Photo uploading.
- Required field missing.
- Image upload error.
- Save error.
- Offline.
- Go Live access permitted.
- Go Live access denied.

### Definition of done
A seller can create a listing using the approved fields, add and reorder up to eight photographs, save a draft and reach Preview only when required information is valid.

---

## Screen 12 — Listing Preview

### Who uses it
Seller creating or editing a listing.

### Prototype status
**INCLUDED**

### Purpose
Show the seller how the listing will appear before it is published.

### How the user reaches it
Screen 11 — Create Listing → Preview.

### What the user sees
A preview using the listing's:

- Main photograph and additional photographs.
- Title.
- Price.
- Category.
- Brand if supplied.
- Colour if supplied.
- Size where relevant.
- Condition.
- Description.
- Shipping notes.

### What the user can do
- Return to edit.
- Publish.
- Save as Draft.

### Where the user can go next
- Screen 11 — Create Listing.
- Screen 13 — My Listings after publishing or saving a draft.
- Screen 9 — Product Details after successful publication.

### Important states
- Preview ready.
- Missing required information.
- Publishing.
- Publish success.
- Publish error.
- Offline.

### Definition of done
The preview accurately reflects the information entered by the seller, and Publish creates one usable listing with the correct main photograph and information.

---

## Screen 13 — My Listings

### Who uses it
Seller/account owner.

### Prototype status
**INCLUDED**

### Purpose
Give a seller one place to see listings they have created.

### How the user reaches it
- Profile.
- Seller/account management routes after creating a listing.

### What the user sees
The user's listings grouped or labelled by relevant state:

- Draft.
- Available.
- Reserved.
- Sold.
- Hidden/deactivated.

### What the user can do
- Create another listing.
- Open a listing.
- Open Seller Listing Management.
- Continue editing a draft.

### Where the user can go next
- Screen 11 — Create Listing.
- Screen 9 — Product Details.
- Screen 14 — Seller Listing Management.

### Important states
- Loading.
- No listings.
- Draft listings.
- Available.
- Reserved.
- Sold.
- Hidden.
- Error.
- Offline.

### Definition of done
The seller can reliably see all of their prototype listings with the correct state and open each listing for viewing or management.

---

## Screen 14 — Seller Listing Management

### Who uses it
Seller who owns the listing.

### Prototype status
**INCLUDED**

### Purpose
Allow a seller to edit and manage an individual listing and see interested buyers without creating a separate Interested Buyers screen.

### How the user reaches it
Screen 13 — My Listings → select/manage a listing.

### What the user sees
- Current listing information.
- Current status.
- Edit controls.
- Deactivate/hide action.
- Delete action when there is no active transaction.
- Manual Mark as Sold action for an item sold outside Throve.
- Interested Buyers component.

Relisting is not required in the prototype.

### What the user can do
- Edit permitted listing information.
- Save changes.
- Deactivate/hide listing.
- Delete when no active transaction exists.
- Manually mark as Sold.
- View users who saved/favourited the item.
- Send one seller-initiated message to an interested buyer.
- Send an offer to an interested buyer.

### Where the user can go next
- Screen 9 — Product Details.
- Screen 13 — My Listings.
- Screen 18 — Offer Details.
- Screen 19 — Chat Conversation.

### Important states
- Draft.
- Available.
- Reserved.
- Sold.
- Hidden.
- Saving.
- Delete disabled during active transaction.
- Error.
- Offline.

### Interested Buyers component

This is merged into Seller Listing Management and is not a separate screen.

The seller may see:

- Interested user's username.
- Profile photograph.
- Confirmation that the user saved/favourited this listing.

The seller must not see:

- Email address.
- Telephone number.
- Home address.

Seller actions:

- Send one message.
- Send an offer.

Anti-spam rule:

- One seller-initiated message per interested buyer per listing unless the buyer replies.
- Repeated unsolicited messaging is not allowed.
- The buyer can block the seller.

### Definition of done
A seller can edit and manage their listing, safely see only approved interested-buyer information and send an allowed message or offer without exposing private buyer details.

---

# 7. Saved items and interested buyers

## Screen 15 — Saved Items

### Who uses it
Buyers and other signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Allow users to view products they have saved or favourited.

### How the user reaches it
- Profile/account routes.
- Product saving interactions.

### What the user sees
Saved products with:

- Main image.
- Title.
- Price.
- Condition.
- Seller.
- Current status.

### What the user can do
- Open a saved product.
- Remove it from Saved.
- Message seller.
- Make an offer when eligible.
- Buy Now when Available.

### Where the user can go next
- Screen 9 — Product Details.
- Screen 10 — Seller Profile.
- Screen 18 — Offer Details.
- Screen 19 — Chat Conversation.
- Screen 20 — Shipping Details.

### Important states
- Loading.
- No Saved items.
- Available.
- Reserved.
- Sold.
- Item removed by seller.
- Error.
- Offline.

### Definition of done
Users can save and unsave products and see their current availability reflected correctly in Saved Items.

---

# 8. Offers

## Screen 16 — Inbox

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Provide the main destination for private conversations and access to the Offers area.

### How the user reaches it
Inbox tab in bottom navigation.

### What the user sees
- Conversations area.
- Offers area.
- Unread/read message indicators where available.

Offers are not a separate bottom-navigation destination.

### What the user can do
- Open a conversation.
- Open Offers.
- Return to bottom navigation.

### Where the user can go next
- Screen 17 — Offers Centre.
- Screen 19 — Chat Conversation.
- Main bottom-navigation destinations.

### Important states
- Loading.
- No conversations.
- No offers.
- Unread conversation.
- Error.
- Offline.

### Definition of done
Inbox is complete when users can reliably access their conversations and the Offers area from one approved bottom-navigation destination.

---

## Screen 17 — Offers Centre

### Who uses it
Buyers and sellers.

### Prototype status
**INCLUDED**

### Purpose
Show offers the user has sent or received without adding another bottom-navigation tab.

### How the user reaches it
Screen 16 — Inbox → Offers.

### What the user sees
Offers with relevant status:

- Sent.
- Received.
- Pending.
- Accepted.
- Rejected.
- Countered.
- Withdrawn.
- Expired.

Offers expire after **24 hours**.

### What the user can do
- Open an offer.
- View sent and received offers.
- Open the related product.
- Open related chat.

### Where the user can go next
- Screen 18 — Offer Details.
- Screen 9 — Product Details.
- Screen 19 — Chat Conversation.
- Screen 16 — Inbox.

### Important states
- Loading.
- No offers.
- Pending.
- Accepted.
- Rejected.
- Countered.
- Withdrawn.
- Expired.
- Error.
- Offline.

### Definition of done
A user can see the current status of every prototype offer relevant to their account and open the related offer, product or conversation.

---

## Screen 18 — Offer Details

### Who uses it
Buyer or seller involved in an offer.

### Prototype status
**INCLUDED**

### Purpose
Show the full offer state and allow the permitted response actions.

### How the user reaches it
- Screen 17 — Offers Centre.
- Product Make Offer component after submission.
- Seller Listing Management after seller sends an offer.
- Chat link where appropriate.

### What the user sees
- Product.
- Listing price.
- Current offer price.
- Buyer and seller usernames.
- Offer expiry.
- Current status.
- Relevant action controls.

### What the user can do
Depending on offer state:

Buyer:

- View sent offer.
- Withdraw before acceptance.
- Accept or reject a seller counter-offer where applicable.
- Proceed toward purchase after an accepted active price.

Seller:

- Accept.
- Reject.
- Counter-offer.

Both users can open chat to discuss the offer.

Multiple users may have active offers on the same listing.

Accepting an offer does **not** reserve or sell the item.

Checkout begins → **Reserved**.

Successful simulated purchase → **Sold**.

Only one buyer may ultimately complete the purchase.

### Where the user can go next
- Screen 9 — Product Details.
- Screen 19 — Chat Conversation.
- Screen 20 — Shipping Details when an eligible buyer starts checkout.
- Screen 17 — Offers Centre.

### Important states
- Pending.
- Accepted.
- Rejected.
- Countered.
- Withdrawn.
- Expired after 24 hours.
- Product became Reserved by another checkout.
- Product Sold to another buyer.
- Action disabled when offer no longer valid.
- Error.
- Offline.

### Definition of done
Offer Details is complete when buyers and sellers can perform the approved offer actions, expired/invalid offers cannot be acted on, and accepting an offer does not incorrectly reserve or sell the item.

---

# 9. Inbox and chat

## Screen 19 — Chat Conversation

### Who uses it
Buyer and seller participating in a private conversation.

### Prototype status
**INCLUDED**

### Purpose
Allow basic private text communication about products and offers.

### How the user reaches it
A conversation may begin from:

- Product listing.
- Seller profile.
- Offer.
- Interested Buyer interaction.
- Inbox.

### What the user sees
- Other participant's username/profile information.
- Related product where relevant.
- Text-message history.
- Sent status.
- Read status where implemented.
- Block User.
- Report User.
- Report Message.

Prototype messages are text only.

### What the user can do
- Send text messages.
- Read received messages.
- Open related product.
- Open related offer where relevant.
- Block the other user.
- Report the user.
- Report an individual message.

Not included:

- Voice notes.
- Video messages.
- Calls.
- Disappearing messages.
- Complex media messaging.

### Where the user can go next
- Screen 16 — Inbox.
- Screen 9 — Product Details.
- Screen 18 — Offer Details.
- Screen 10 — Seller Profile.

### Important states
- Loading conversation.
- No messages yet.
- Sending.
- Sent.
- Read.
- Send failed.
- User blocked.
- Report submitted.
- Access denied.
- Offline.

If read receipts prove unnecessarily difficult during implementation, they may be postponed without changing the core chat journey.

### Definition of done
Two authorised conversation participants can exchange private text messages, unauthorised users cannot read the conversation, and Block/Report actions are available and testable.

---

# 10. Simulated checkout

All checkout screens must clearly state:

**“Prototype purchase — no real money will be charged.”**

Starting checkout reserves an Available item for approximately **10 minutes**.

If the reservation expires or checkout is abandoned, the item returns to Available.

---

## Screen 20 — Shipping Details

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Collect temporary delivery information needed for the simulated purchase.

### How the user reaches it
Screen 9 — Product Details → Buy Now, or an eligible accepted-offer purchase route.

### What the user sees
- Reserved-item notice/countdown where appropriate.
- Test/demo shipping-address fields.
- Clear prototype/no-real-money notice.

During early prototype testing:

- Use test/demo addresses.
- Do not encourage unnecessary sensitive personal information.
- Address information is not permanently saved to the account.

### What the user can do
- Enter test/demo shipping information.
- Continue.
- Cancel checkout.

### Where the user can go next
- Screen 21 — Delivery Method.
- Screen 9 — Product Details if checkout is cancelled.

### Important states
- Item Reserved.
- Reservation countdown.
- Address incomplete.
- Saving/validation.
- Reservation expired → Available.
- Item no longer available.
- Error.
- Offline.

### Definition of done
The buyer can enter valid test/demo shipping details without permanently saving them, and the listing is protected from a second successful purchase during the active reservation.

---

## Screen 21 — Delivery Method

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Allow the buyer to select the delivery method used in the simulated purchase.

### How the user reaches it
Screen 20 — Shipping Details → Continue.

### What the user sees
- Item reservation/countdown where appropriate.
- Available simulated delivery methods.
- Any simulated delivery charge or timing information.

The exact prototype delivery-method choices and simulated delivery-charge rules are **To be decided**.

### What the user can do
- Select one available delivery method.
- Continue.
- Go back.

### Where the user can go next
- Screen 22 — Checkout Summary.
- Screen 20 — Shipping Details.

### Important states
- No delivery method selected.
- Method selected.
- Delivery method unavailable.
- Loading.
- Reservation expired.
- Error.
- Offline.

### Definition of done
The screen is complete when the approved prototype delivery choices can be selected and the chosen method correctly appears in Checkout Summary.

---

## Screen 22 — Checkout Summary

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Give the buyer a final review of the simulated purchase before simulated payment.

### How the user reaches it
Screen 21 — Delivery Method → Continue.

### What the user sees
- Item.
- Seller.
- Price.
- Delivery information.
- Selected delivery method.
- Relevant simulated delivery charge.
- Relevant simulated total.
- Reservation information.
- Clear no-real-money notice.

The exact simulated delivery-charge calculation is **To be decided**.

### What the user can do
- Review the order.
- Return to edit shipping information.
- Return to delivery method.
- Continue to Simulated Payment.
- Cancel checkout.

### Where the user can go next
- Screen 23 — Simulated Payment.
- Screen 20 — Shipping Details.
- Screen 21 — Delivery Method.

### Important states
- Loading.
- Reservation active.
- Reservation nearly expired.
- Reservation expired.
- Item unavailable.
- Error.
- Offline.

### Definition of done
The buyer can confirm the correct item, seller, delivery information, selected delivery method and simulated total before continuing, with the no-real-money notice clearly visible.

---

## Screen 23 — Simulated Payment

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Demonstrate the payment step without taking real money.

### How the user reaches it
Screen 22 — Checkout Summary → Continue.

### What the user sees
- Clear prototype/no-real-money notice.
- Simulated purchase amount.
- Control to complete the simulated payment.
- No real card, bank or payment-provider collection.

### What the user can do
- Complete simulated payment.
- Return to Checkout Summary before completion.

### Where the user can go next
- Screen 24 — Order Confirmation after success.
- Screen 22 — Checkout Summary.

### Important states
- Ready.
- Processing simulated payment.
- Purchase success.
- Simulated payment failure.
- Reservation expired.
- Product became unavailable.
- Offline/error.

On success:

- Listing becomes **Sold**.
- No real money is charged.
- No seller payout occurs.

### Definition of done
The simulated payment can succeed or fail in a testable way, never requests real payment information, and successful completion changes the unique listing to Sold exactly once.

---

## Screen 24 — Order Confirmation

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Confirm that the simulated purchase was successfully created.

### How the user reaches it
Screen 23 — successful Simulated Payment.

### What the user sees
- Purchase successful.
- Clear statement that no real money was charged.
- Purchased item.
- Seller.
- Simulated delivery information.
- Order reference.
- Link/button to Order Details.
- Return to live session where relevant and still active.

### What the user can do
- Open Order Details.
- Return Home.
- Message seller.
- Return to the active live session when the purchase came from a live claim and the session remains available.

### Where the user can go next
- Screen 26 — Order Details.
- Screen 19 — Chat Conversation.
- Screen 6 — Home.
- Screen 28 — Live-Shopping Viewer where relevant.

### Important states
- Order being created.
- Success.
- Order creation error after simulated payment.
- Live session still active.
- Live session ended.

### Definition of done
A successful simulated purchase creates a single order reference, clearly states that no money was charged and provides a working route to Order Details.

---

# 11. Orders and delivery

## Screen 25 — Orders

### Who uses it
Buyers and sellers.

### Prototype status
**INCLUDED**

### Purpose
Show purchases and sales connected to the same Throve account.

### How the user reaches it
Profile/account routes and relevant order links.

### What the user sees
Clearly differentiated views for:

- Purchases as buyer.
- Sales as seller.

Order information may include:

- Product.
- Other party.
- Order reference.
- Current status.

Prototype order statuses:

1. Paid.
2. Awaiting dispatch.
3. Dispatched.
4. In transit.
5. Delivered.
6. Completed.

Additional status:

- Cancelled.

“Paid” means simulated prototype purchase success; no real money was collected.

### What the user can do
- Open an order.
- Switch between relevant purchase/sale views.
- Open related product or chat where appropriate.

### Where the user can go next
- Screen 26 — Order Details.
- Screen 19 — Chat Conversation.
- Screen 9 — Product Details.

### Important states
- Loading.
- No purchases.
- No sales.
- Each approved order status.
- Error.
- Offline.

### Definition of done
The account owner can see their prototype purchases and sales with correct statuses without requiring separate buyer and seller accounts.

---

## Screen 26 — Order Details

### Who uses it
Buyer or seller involved in an order.

### Prototype status
**INCLUDED**

### Purpose
Show one prototype order, delivery progress and the actions relevant to the buyer or seller.

### How the user reaches it
- Screen 24 — Order Confirmation.
- Screen 25 — Orders.

### What the user sees
- Product.
- Buyer or seller as appropriate.
- Order reference.
- Current order status.
- Delivery status.
- Shipping information.
- Basic/simulated tracking information where present.
- Clear indication that this is a prototype order with no real payment.

### What the user can do

Buyer:

- View delivery progress.
- Message seller.
- Confirm **Item received** when appropriate.

Seller:

- View sale.
- Message buyer.
- Mark order as dispatched.
- Enter basic/simulated tracking information.

Seller Shipping Update is merged into this screen.

### Where the user can go next
- Screen 19 — Chat Conversation.
- Screen 9 — Product Details.
- Screen 25 — Orders.

### Important states
- Paid.
- Awaiting dispatch.
- Dispatched.
- In transit.
- Delivered.
- Completed.
- Cancelled.
- Tracking information absent/present.
- Updating shipping.
- Buyer confirmation successful.
- Error.
- Offline.

Buyer confirmation:

- Buyer taps **Item received**.
- Order moves toward **Completed**.

There is no seller payout because the prototype uses no real money.

The exact rules for who may cancel an order and at what stage are **To be decided**.

### Definition of done
Buyer and seller see the correct version of the same order, the seller can record dispatch/tracking, delivery can progress through approved prototype statuses, and the buyer can confirm receipt.

---

# 12. Live-shopping discovery

## Screen 27 — Live-Shopping Discovery

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Help users discover real live-shopping sessions without adding a permanent Live tab.

### How the user reaches it
- Home Live Now/Upcoming sections.
- Relevant seller profiles.
- Other approved discovery links.

### What the user sees
- Live Now sessions.
- Upcoming Lives.
- Host information.
- Cover image/thumbnail where available.
- Live title/category where available.

### What the user can do
- Enter a Live Now session.
- View an upcoming live.
- Open the seller profile.
- Return to Home.

### Where the user can go next
- Screen 28 — Live-Shopping Viewer.
- Screen 10 — Seller Profile.
- Screen 6 — Home.

### Important states
- Loading.
- No Live Now sessions.
- No Upcoming Lives.
- Session Live.
- Session ended.
- Error.
- Offline.

### Definition of done
Users can discover active and upcoming sessions through marketplace discovery and open an active real-video session without requiring a sixth navigation tab.

---

# 13. Live-shopping viewer experience

## Screen 28 — Live-Shopping Viewer

### Who uses it
Signed-in viewers/buyers.

### Prototype status
**INCLUDED**

### Purpose
Allow users to watch real live video, interact through comments, view featured products and claim/buy products through simulated checkout.

### How the user reaches it
- Screen 27 — Live-Shopping Discovery.
- Home Live Now.
- Seller Profile when seller is live.

### What the user sees
- Real live video.
- Host username/profile information.
- Link to host profile.
- Text-only live comments.
- Comment entry.
- Currently pinned/featured product.
- Product image.
- Product name.
- Size where relevant.
- Condition.
- Price.
- Claim.
- Buy Now.
- Report controls.
- Leave Live.

Public comments exist here, not on normal product-listing pages.

### What the user can do
- Watch live video.
- Open host profile.
- Read comments.
- Add a text comment.
- View featured product information.
- Claim the featured product.
- Buy through simulated checkout.
- Report live session.
- Report user.
- Report listing.
- Leave the session.

### Where the user can go next
- Screen 10 — Seller Profile.
- Screen 20 — Shipping Details when Claim/Buy Now enters checkout.
- Screen 27 — Live-Shopping Discovery.
- Screen 6 — Home.

### Important states

#### Live video
- Connecting.
- Live.
- Connection lost.
- Reconnecting.
- Session ended.
- Reconnection failed.

Connection-loss message:

**“Connection lost — reconnecting…”**

If reconnection ultimately fails:

- End the session gracefully.
- Offer a route to Live Discovery or Seller Profile.

#### Comments
- No comments.
- Comment sending.
- Comment sent.
- Comment failed.
- Comment removed.
- Viewer muted/removed where applicable.

Basic rules prohibit:

- Abuse.
- Harassment.
- Spam.
- Prohibited content.

#### Featured product
- Available.
- Reserved.
- Sold.
- No product currently pinned.

#### Live claim
Flow:

Seller pins listing  
→ viewer taps Claim  
→ listing becomes Reserved  
→ approximately 5-minute claim countdown begins  
→ viewer continues through simulated checkout  
→ successful simulated purchase changes listing to Sold  
→ live experience visibly displays **SOLD**

If claim expires without successful purchase:

→ listing returns to Available.

### Definition of done
A viewer can watch real live video, comment, open host information, see a pinned product, claim it, enter simulated checkout and see the product become Sold after one successful simulated purchase, including a usable connection-failure state.

---

# 14. Live-shopping host experience

## Screen 29 — Live-Hosting Access

### Who uses it
A seller who is not approved to host live sessions.

### Prototype status
**INCLUDED**

### Purpose
Explain that live hosting is currently invite-only when a non-approved user attempts to Go Live.

### How the user reaches it
Sell → Go Live when the account does not have host approval.

### What the user sees
- A clear explanation that live hosting is currently invite-only/approval-only.
- No complex host application form.

Host approval is controlled by an administrator.

Technical approval flags must not be shown to users.

### What the user can do
- Return to Sell.
- Return to Home/Profile.

### Where the user can go next
- Screen 11 — Create Listing/Sell area.
- Screen 6 — Home.
- Screen 32 — My Profile.

### Important states
- Access denied/not approved.
- Loading approval status.
- Approval check error.
- Offline.

### Definition of done
A non-approved user cannot start a live session and receives a clear, non-technical explanation of the invite-only restriction.

---

## Screen 30 — Prepare / Schedule Live

### Who uses it
Approved live host.

### Prototype status
**INCLUDED**

### Purpose
Allow an approved seller to prepare or schedule a live session before broadcasting.

### How the user reaches it
Sell → Go Live when host approval is present.

### What the user sees
Fields for:

- Live title.
- Cover image/thumbnail.
- Category.
- Optional short description.
- Selected listings/products.
- Scheduled date/time where applicable.
- Camera readiness.
- Microphone readiness.

### What the user can do
- Add/edit live details.
- Select products/listings.
- Choose a scheduled time where applicable.
- Check camera/microphone permissions.
- Start Live.
- Cancel.

### Where the user can go next
- Screen 31 — Live Host Broadcast.
- Sell area/Home if cancelled.

### Important states
- Draft/preparation.
- Scheduled.
- Ready.
- Camera permission denied.
- Microphone permission denied.
- Permission/access error.
- Starting.
- Start failed.
- Offline.

### Definition of done
An approved host can enter the required live information, select products, satisfy camera/microphone requirements and successfully start a real live-video session.

---

## Screen 31 — Live Host Broadcast

### Who uses it
Approved live host.

### Prototype status
**INCLUDED**

### Purpose
Allow the seller to run the real live session, present products and demonstrate basic live moderation.

### How the user reaches it
Screen 30 — Prepare / Schedule Live → Start Live.

### What the user sees
- Live camera view.
- Live status.
- Viewer comments.
- Selected product/listing controls.
- Currently pinned product.
- Product status.
- Viewer/comment moderation controls.
- End Live.

### What the user can do
- Broadcast real live video.
- Read comments.
- Select/pin the item currently being shown.
- Move to another product.
- Remove an inappropriate comment where practical.
- Remove or mute a disruptive viewer where practical.
- End the live session.

When a viewer successfully completes a simulated purchase:

- The product changes to Sold.
- The host view visibly shows **SOLD**.
- Host can move to the next item.

### Where the user can go next
- Ended-live state on this screen.
- Screen 6 — Home.
- Screen 27 — Live-Shopping Discovery.
- Screen 10 — Seller Profile where relevant.

### Important states
- Starting.
- Live.
- No viewers.
- No comments.
- Product Available.
- Product Reserved by live claim.
- Product Sold.
- Connection lost.
- Reconnecting.
- Permission lost.
- Ending.
- Ended.
- Reconnection failed.

If reconnection fails permanently:

- End the session gracefully.

When the host ends the session:

- Show Live ended confirmation.
- A simple session summary may be shown if useful.
- Do not add complex live analytics.

### Definition of done
An approved host can start and end a real live session, pin products, see product claim/sold status, view comments and demonstrate the approved basic moderation actions without exposing unapproved advanced live features.

---

# 15. User profile and settings

## Screen 32 — My Profile

### Who uses it
Signed-in account owner.

### Prototype status
**INCLUDED**

### Purpose
Show the user's own profile and provide access to their buying and selling activity.

### How the user reaches it
Profile tab in bottom navigation.

### What the user sees
- Profile photograph.
- Username.
- Bio.
- Location.
- Active listings.
- Sold listings.
- Relevant live-shopping activity.
- Routes to account areas.

The same account supports buying and selling.

### What the user can do
- Open Edit Profile.
- Open My Listings.
- Open Saved Items.
- Open Orders.
- Open Settings and Account.
- Open relevant live activity.

### Where the user can go next
- Screen 13 — My Listings.
- Screen 15 — Saved Items.
- Screen 25 — Orders.
- Screen 33 — Edit Profile.
- Screen 34 — Settings and Account.
- Relevant live-shopping screens.

### Important states
- Loading.
- No active listings.
- No sold listings.
- No live activity.
- Profile incomplete.
- Error.
- Offline.

### Definition of done
The user can view the approved profile information and reach their listing, saved-item, order and account-management areas from the same account.

---

## Screen 33 — Edit Profile

### Who uses it
Signed-in account owner.

### Prototype status
**INCLUDED**

### Purpose
Allow the user to update the approved editable profile fields.

### How the user reaches it
- Screen 32 — My Profile.
- Screen 34 — Settings and Account.

### What the user sees
Editable:

- Profile photograph.
- Username.
- Bio.
- Location.

### What the user can do
- Change profile photograph.
- Change username.
- Edit bio.
- Edit location.
- Save.
- Cancel.

### Where the user can go next
- Screen 32 — My Profile.
- Screen 34 — Settings and Account.

### Important states
- Loading.
- Unsaved changes.
- Photo uploading.
- Username unavailable.
- Saving.
- Save success.
- Error.
- Offline.

### Definition of done
Approved profile fields can be changed and saved, and the new information appears correctly on the user's profile.

---

## Screen 34 — Settings and Account

### Who uses it
Signed-in account owner.

### Prototype status
**INCLUDED**

### Purpose
Provide the approved account, security and user-control settings.

### How the user reaches it
Screen 32 — My Profile → Settings and Account.

### What the user sees
- Edit Profile.
- Account details.
- Login/security.
- Blocked users.
- Logout.
- Delete account.

Advanced privacy controls are later-version functionality unless separately approved.

### What the user can do
- Open Edit Profile.
- View approved account details.
- Access prototype login/security information.
- View/manage blocked users.
- Log out.
- Start Delete Account.

### Where the user can go next
- Screen 33 — Edit Profile.
- Screen 1 — Welcome after logout.
- Screen 32 — My Profile.

### Important states
- Loading.
- Logout in progress.
- Logged out.
- Blocked-user list empty.
- Delete-account confirmation.
- Delete action in progress.
- Error.
- Offline.

The exact prototype consequences/data-retention behaviour for Delete Account are **To be decided** and require technical review because real accounts and personal data are involved.

### Definition of done
The approved settings are accessible, logout works, blocked-user management is visible, and Delete Account cannot be triggered accidentally.

---

# 16. Later-version screens

The following functionality is intentionally outside the active prototype.

These areas use **L-numbering** and are not included in the prototype screen count.

---

## Later Screen L1 — Real Payment Checkout

### Who uses it
Buyer.

### Prototype status
**LATER VERSION**

### Purpose
Collect real money using an approved production payment provider.

### How the user reaches it
A future production checkout.

### What the user sees
Real payment method, transaction amount and approved fees.

### What the user can do
Complete a real payment.

### Where the user can go next
Production order confirmation.

### Important states
Payment pending, successful, failed, reversed or otherwise required by the future payment provider.

### Definition of done
Not applicable to prototype approval. Requires separate production payment and security review.

---

## Later Screen L2 — Seller Payouts

### Who uses it
Seller.

### Prototype status
**LATER VERSION**

### Purpose
Manage real money owed and paid to sellers.

### How the user reaches it
Future seller financial tools.

### What the user sees
Payout method, balance and payout history.

### What the user can do
Manage approved payout information.

### Where the user can go next
Future payout details.

### Important states
Pending, held, paid, failed.

### Definition of done
Requires separate payment, payout and security approval.

---

## Later Screen L3 — Production Identity Verification

### Who uses it
Users requiring future verification.

### Prototype status
**LATER VERSION**

### Purpose
Support any future government-ID, bank or production seller-verification requirements.

### How the user reaches it
Future verification flow.

### What the user sees
Only future approved verification requirements.

### What the user can do
Complete approved verification.

### Where the user can go next
Verified account areas.

### Important states
Not started, pending, verified, rejected.

### Definition of done
Requires separate legal, privacy and technical review.

---

## Later Screen L4 — Refund and Dispute Centre

### Who uses it
Buyer, seller and authorised Throve reviewer.

### Prototype status
**LATER VERSION**

### Purpose
Handle production returns, refunds, disputes and evidence.

### How the user reaches it
Future real Order Details.

### What the user sees
Claim, evidence, return and decision information.

### What the user can do
Submit/respond to a dispute.

### Where the user can go next
Future refund/return status.

### Important states
Open, evidence required, under review, approved, rejected, closed.

### Definition of done
Requires separate refund, chargeback, consumer-protection and security review.

---

## Later Screen L5 — Production Shipping Labels and Courier Tracking

### Who uses it
Buyer and seller.

### Prototype status
**LATER VERSION**

### Purpose
Integrate real shipping-label creation and automated courier tracking.

### How the user reaches it
Future production Order Details.

### What the user sees
Courier, label and live tracking information.

### What the user can do
Use approved production shipping services.

### Where the user can go next
Order and tracking details.

### Important states
Label created, collected, in transit, delivered, delayed, failed delivery.

### Definition of done
Requires approved courier integrations and production testing.

---

## Later Screen L6 — Auctions

### Who uses it
Future live-shopping participants.

### Prototype status
**LATER VERSION**

### Purpose
Support auction-style selling if separately approved in the future.

### How the user reaches it
Future live-shopping experience.

### What the user sees
To be decided in a later product decision.

### What the user can do
To be decided.

### Where the user can go next
To be decided.

### Important states
To be decided.

### Definition of done
Not defined because auctions are excluded from the first prototype.

---

## Later Screen L7 — Advanced Live Features

### Who uses it
Future hosts and viewers.

### Prototype status
**LATER VERSION**

### Purpose
Hold future live-shopping functionality such as:

- Live gifting.
- Paid gifts.
- Multi-host sessions.
- Creator commissions.
- Complex giveaways.

### How the user reaches it
Future live-shopping screens.

### What the user sees
To be decided.

### What the user can do
To be decided.

### Where the user can go next
To be decided.

### Important states
To be decided.

### Definition of done
These features require separate approval and are not part of prototype completion.

---

## Later Screen L8 — Advanced Recommendations

### Who uses it
Buyer.

### Prototype status
**LATER VERSION**

### Purpose
Provide more sophisticated personalised marketplace recommendations.

### How the user reaches it
Future Home/Search experiences.

### What the user sees
Future personalised discovery content.

### What the user can do
Browse future recommendations.

### Where the user can go next
Product or seller pages.

### Important states
Loading, no recommendations, error.

### Definition of done
Not required for the prototype; simple seeded/recent/sample discovery is sufficient.

---

## Later Screen L9 — Seller Analytics

### Who uses it
Seller.

### Prototype status
**LATER VERSION**

### Purpose
Provide complex seller performance and sales analytics.

### How the user reaches it
Future seller tools.

### What the user sees
Future approved seller performance information.

### What the user can do
Review analytics.

### Where the user can go next
Future listing/seller tools.

### Important states
Loading, no data, error.

### Definition of done
Not required for prototype approval.

---

## Later Screen L10 — Paid Promotions and Subscriptions

### Who uses it
Seller.

### Prototype status
**LATER VERSION**

### Purpose
Support paid listing boosts, promotion tools or seller subscriptions if approved.

### How the user reaches it
Future seller tools.

### What the user sees
Approved prices, plans or boost options.

### What the user can do
Purchase/manage future approved promotion or subscription.

### Where the user can go next
Future real payment flow.

### Important states
Inactive, pending, active, expired, failed.

### Definition of done
Requires separate business-model and real-payment approval.

---

## Later Screen L11 — International, Currency and Language Settings

### Who uses it
Future users outside the initial Nigeria-only scope.

### Prototype status
**LATER VERSION**

### Purpose
Support future international buying/selling, multiple currencies and multiple languages.

### How the user reaches it
Future marketplace/account settings.

### What the user sees
To be decided.

### What the user can do
To be decided.

### Where the user can go next
To be decided.

### Important states
To be decided.

### Definition of done
Not required for the Nigeria-focused prototype.

---

## Later Screen L12 — Luxury Authentication

### Who uses it
Future buyers, sellers or authorised reviewers.

### Prototype status
**LATER VERSION**

### Purpose
Support any future luxury-item authentication process.

### How the user reaches it
Future listing/order flows.

### What the user sees
To be decided.

### What the user can do
To be decided.

### Where the user can go next
To be decided.

### Important states
To be decided.

### Definition of done
Requires a separate product and operational decision.

---

## Later Screen L13 — Advanced Moderation and Admin

### Who uses it
Authorised Throve administrators/moderators.

### Prototype status
**LATER VERSION**

### Purpose
Provide production-scale moderation and administrative controls.

### How the user reaches it
Future protected administrator interface.

### What the user sees
To be decided.

### What the user can do
To be decided.

### Where the user can go next
To be decided.

### Important states
Access denied, authorised, review pending, action completed.

### Definition of done
Requires separate admin-access and security design.

---

## Later Screen L14 — Saved Shipping Addresses

### Who uses it
Buyer.

### Prototype status
**LATER VERSION**

### Purpose
Allow users to permanently save delivery addresses.

### How the user reaches it
Future checkout/account settings.

### What the user sees
Saved delivery addresses.

### What the user can do
Add, edit, select or delete approved addresses.

### Where the user can go next
Future checkout.

### Important states
No saved addresses, default address, error.

### Definition of done
Requires separate privacy and personal-data review.

---

## Later Screen L15 — Complex Notification Settings

### Who uses it
Signed-in users.

### Prototype status
**LATER VERSION**

### Purpose
Allow detailed control over future notification preferences.

### How the user reaches it
Future Settings.

### What the user sees
Future approved notification categories and controls.

### What the user can do
Change notification preferences.

### Where the user can go next
Settings.

### Important states
Enabled, disabled, permission denied.

### Definition of done
Not required for prototype approval.

---

# High-risk areas requiring technical review

A working prototype does **not** mean these systems are secure or production-ready.

The following require technical review before real public use:

- Authentication.
- Account recovery.
- Database permissions.
- Private messages.
- Personal user information.
- User-uploaded content.
- Real payments.
- Seller payouts.
- Refunds.
- Chargebacks.
- Order security.
- Live-video permissions.
- Admin access.

Particular prototype checks must confirm:

- Private chats are only visible to authorised participants.
- Users cannot alter another user's private account information.
- A seller cannot access an interested buyer's private email, phone number or address.
- One unique listing cannot be successfully purchased twice.
- Live-host restrictions cannot be bypassed through normal user controls.
- Admin-only powers are not exposed to normal users.

---

# Final Prototype Screen Count

**34 actual prototype screens**

Prototype numbering is sequential from **Screen 1 to Screen 34**.

---

# Merged Components

The following are included in the prototype but are **not counted as separate screens**:

1. **Filters and Sorting**  
   Merged into Screen 8 — Search / Search Results.

2. **Interested Buyers**  
   Merged into Screen 14 — Seller Listing Management.

3. **Seller Shipping Update**  
   Merged into Screen 26 — Order Details.

4. **Make Offer entry**  
   Implemented as a component/modal from Screen 9 — Product Details rather than a separate screen.

5. **Seller offer to interested buyer**  
   Initiated from the Interested Buyers component within Screen 14.

6. **Checkout reservation countdown**  
   A state/component of the checkout flow rather than a separate screen.

7. **Live product card / pinned product**  
   A component of Screens 28 and 31.

8. **Live Claim countdown**  
   A component/state of Screen 28 rather than a separate screen.

9. **Live comment/report controls**  
   Components of the live viewer/host screens.

10. **Purchase Success**  
    Treated as the success state of Screen 23 — Simulated Payment before Screen 24 — Order Confirmation, rather than a duplicate standalone screen.

11. **End Live confirmation**  
    Treated as the ended state of Screen 31 — Live Host Broadcast rather than an additional screen.

12. **Account verification**  
    Treated as part of Sign Up/email magic-link flow rather than an additional screen.

---

# Later-Version Screen Count

**15 later-version screen areas are documented.**

They are labelled **L1–L15** and are not included in the 34-screen prototype count.

---

# Remaining Decisions

The following genuine implementation decisions remain **To be decided**:

1. **Account Recovery method**  
   Account Recovery is included, but the exact recovery mechanism beyond the approved email-based login system still needs to be defined before coding that flow.

2. **Prototype Delivery Method choices**  
   The Delivery Method screen is included, but the exact delivery choices presented to prototype buyers have not yet been defined.

3. **Simulated delivery-charge calculation**  
   Checkout Summary must show a relevant simulated total, but the exact prototype delivery-charge values/rules have not yet been defined.

4. **Prototype order-cancellation rules**  
   `Cancelled` is an approved order status, but who may cancel an order and at which stages has not yet been defined.

5. **Delete Account behaviour**  
   Delete Account is approved in Settings, but the exact prototype treatment of account data after deletion has not yet been defined.

These decisions do not change the approved screen structure, but they must be resolved before the affected functions are fully coded and tested.

---

# Core Journey Coverage Check

## Journey 1 — Account creation → Basic Account Setup → Home

- Screen 1 — Welcome
- Screen 2 — Sign Up
- Screen 5 — Basic Account Setup
- Screen 6 — Home

**Coverage:** Complete.

---

## Journey 2 — Home/Search → Product → Seller Profile

Routes:

- Screen 6 — Home
- Screen 8 — Search / Search Results
- Screen 9 — Product Details
- Screen 10 — Seller Profile

**Coverage:** Complete.

---

## Journey 3 — Sell → Create Listing → Preview → Publish

- Sell bottom-navigation action
- Screen 11 — Create Listing
- Screen 12 — Listing Preview
- Screen 13 — My Listings and/or Screen 9 — Product Details after publication

**Coverage:** Complete.

---

## Journey 4 — Save Item → Seller sees interested buyer → Seller sends message or offer

- Screen 9 — Product Details
- Screen 15 — Saved Items
- Screen 14 — Seller Listing Management / Interested Buyers component
- Screen 19 — Chat Conversation
- Screen 18 — Offer Details

**Coverage:** Complete.

---

## Journey 5 — Buyer makes offer → Seller rejects/accepts/counter-offers → Buyer proceeds toward purchase

- Screen 9 — Product Details / Make Offer component
- Screen 17 — Offers Centre
- Screen 18 — Offer Details
- Screen 20 — Shipping Details onward if buyer proceeds to purchase

**Coverage:** Complete.

---

## Journey 6 — Buyer/seller chat → Block/Report

- Screen 16 — Inbox
- Screen 19 — Chat Conversation
- Block User component
- Report User component
- Report Message component

**Coverage:** Complete.

---

## Journey 7 — Product → Buy Now → Shipping Details → Checkout Summary → Simulated Payment → Order Confirmation → Order Details

- Screen 9 — Product Details
- Screen 20 — Shipping Details
- Screen 21 — Delivery Method
- Screen 22 — Checkout Summary
- Screen 23 — Simulated Payment
- Screen 24 — Order Confirmation
- Screen 26 — Order Details

**Coverage:** Complete.

---

## Journey 8 — Seller receives order → Seller marks dispatched → Delivery progresses → Buyer confirms receipt

- Screen 25 — Orders
- Screen 26 — Order Details
- Seller Shipping Update component inside Screen 26
- Simulated delivery-status progression inside Screen 26
- Buyer Item Received action inside Screen 26

**Coverage:** Complete.

---

## Journey 9 — Live Discovery → Live Viewer → Featured Product → Claim → Simulated Checkout → Sold

- Screen 27 — Live-Shopping Discovery
- Screen 28 — Live-Shopping Viewer
- Pinned Product component
- Live Claim component/countdown
- Screens 20–24 — Simulated Checkout
- Return to Screen 28 where the purchased product displays Sold when applicable

**Coverage:** Complete.

---

## Journey 10 — Approved Seller → Prepare/Schedule Live → Start Live → Pin Product → Manage comments/viewers → Product claimed/sold → End Live

- Sell → Go Live
- Screen 30 — Prepare / Schedule Live
- Screen 31 — Live Host Broadcast
- Product pinning component
- Comment/viewer moderation components
- Product Reserved/Sold states
- Ended-live state on Screen 31

For a non-approved seller:

- Screen 29 — Live-Hosting Access prevents hosting.

**Coverage:** Complete.

---

# Prototype Approval Requirements

The prototype must support all ten approved core journeys before overall prototype approval.

A screen or feature must not be marked complete solely because a coding agent says it is complete.

Evidence may include:

- Founder manual testing.
- Screenshots.
- Screen recordings.
- Relevant automated tests.
- Independent Reviewer Agent review.
- Testing on a physical phone.

During development:

- Regular testing on the founder's own phone is acceptable.
- Known defects and incomplete states must be recorded rather than ignored.
- Loading, empty, error, success, disabled, access-denied and connection states must be tested where relevant.

Before overall prototype approval:

- Test on at least one real iPhone.
- Test on at least one real Android device.
- Complete all ten core user journeys.
- Verify listing Available, Reserved and Sold behaviour.
- Verify checkout reservation behaviour.
- Verify that two buyers cannot successfully obtain the same unique item.
- Verify basic buyer–seller chat privacy.
- Verify the approved offer and counter-offer flow.
- Verify the complete simulated checkout flow.
- Verify buyer and seller order views.
- Verify dispatch and delivery-confirmation behaviour.
- Verify real live video as viewer and host.
- Verify live product claim and Sold behaviour.
- Verify live connection-loss handling.
- Resolve all Critical Reviewer findings.
- Record remaining non-critical prototype limitations.

Approximately **5–10 external testers** may later be used for prototype usability testing.

Passing prototype approval does **not** mean the app is secure or production-ready for public payments, payouts or sensitive data handling.

---

# Conditions That Prevent Prototype Approval

The prototype must **not** be approved if any of the following remain unresolved:

- The app crashes during a core journey.
- A user cannot create a real prototype account.
- A user cannot access their account through the approved login flow.
- A seller cannot create and publish a listing.
- A user cannot browse or view products.
- Saved/favourite items do not work.
- Core offer or counter-offer behaviour does not work.
- Buyer–seller chat does not work.
- Private messages are visible to unauthorised users.
- Simulated checkout fails.
- The prototype accidentally attempts to collect real money.
- Checkout reservation does not prevent conflicting successful purchases.
- Two buyers can successfully obtain the same unique item.
- Orders are not created correctly after simulated purchase.
- Seller dispatch update does not work.
- Buyer receipt confirmation does not work.
- The core live-shopping flow fails.
- Real live video cannot be demonstrated.
- Live product Claim/reservation behaviour fails.
- A successfully purchased live item does not become Sold.
- Non-approved users can improperly start a live session.
- Serious authentication or security problems are present.
- Important navigation or buttons do not work.
- There is a major mobile-layout failure on the required test devices.
- Critical loading, error or access-denied states leave the user trapped.
- Unresolved Critical Reviewer findings remain.

---

# Prototype boundary

The 34-screen prototype is designed to demonstrate Throve's approved product experience.

It deliberately does **not** represent a production-ready marketplace.

Real payments, seller payouts, production identity verification, automated refunds, chargebacks, real courier infrastructure and other later-version systems must not be treated as complete merely because their prototype journeys can be simulated.
