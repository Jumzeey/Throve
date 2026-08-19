# SCREENS.md

## Throve Prototype Screen Specification

**Document status:** Updated — screen structure approved; five implementation decisions resolved  
**Last updated:** 17 August 2026 — implementation decisions resolved  
**Platform:** One shared mobile application for iPhone and Android  
**Initial market:** Nigeria  
**Prototype payments:** Simulated only — no real money  
**Live video:** Real live video included  
**Account model:** One account can buy and sell  
**Numbered prototype screens:** 34

**Source basis:** Updated `PRODUCT.md`, the existing approved `SCREENS.md`, and the approved Throve prototype decisions recorded in this project.

---

# Prototype rules

Throve is a mobile-first social fashion and beauty resale marketplace for new, unused and pre-owned items.

The prototype must support:

- One account that can both buy and sell.
- Real user accounts.
- Email magic-link login.
- Email verification.
- Product listings.
- Department and Category classification.
- Saved/favourite items.
- Buyer–seller text chat.
- Offers and counter-offers.
- Seller contact with interested buyers.
- Seller ratings and reviews after completed Throve transactions.
- Simulated checkout without real money.
- Orders and simulated delivery progress.
- Real live video.
- Live comments.
- Live product presentation and claims.
- Invite-only live hosting.

Public comments are **not** allowed on ordinary product listings.

The permanent bottom navigation contains exactly five destinations:

1. Home
2. Live
3. Sell
4. Inbox
5. Profile

**Search remains an included prototype feature but is not a permanent bottom-navigation destination.**

Search should be accessible through a prominent search icon from Home and from other appropriate discovery areas where useful.

The permanent **Live** navigation destination opens:

**Screen 27 — Live-Shopping Discovery**

No sixth permanent navigation item should be added.

Prototype functionality must remain clearly distinguished from production-ready functionality.

---

# Marketplace classification rules

Throve uses two separate product-classification fields:

- **Department**
- **Category**

Example:

**Department:** Women  
**Category:** Shoes

The approved browsing departments are:

- All
- Women
- Men
- Kids

**All** is a browsing and filtering scope. It must not be stored as a listing's Department.

## Women categories

- All
- Clothing
- Shoes
- Bags
- Accessories
- Beauty

## Men categories

- All
- Clothing
- Shoes
- Bags
- Accessories
- Grooming

## Kids categories

- All
- Clothing
- Shoes
- Bags
- Accessories

Within a department, **All** is also a browsing/filter scope and must not be stored as the listing's Category.

The user-facing department name is **Kids**, not Children.

Unisex is not included in the prototype.

No additional category level or large taxonomy should be introduced without a separate product decision.

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

For standard checkout, the prototype reservation target is approximately **10 minutes**.

For a live product claim, the prototype claim reservation target is approximately **5 minutes**.

These times may later be adjusted through prototype testing.

## Sold

A Sold listing:

- Has completed a successful simulated purchase, or has been manually marked Sold by the seller where allowed.
- Cannot be purchased again.
- May remain visible on the seller's profile with a clear **Sold** label.
- Should not appear among normal available search results.

## Status changes

Where practical, status changes happen automatically:

- Checkout starts → **Reserved**
- Checkout expires or is abandoned → **Available**
- Live claim starts → **Reserved**
- Live claim expires → **Available**
- Simulated purchase succeeds → **Sold**

A seller may manually mark an item Sold if it was sold outside Throve during the prototype.

Preventing two buyers from successfully obtaining the same unique item is a core prototype requirement.

---

# Seller rating and review rules

Seller ratings and reviews are included in the prototype.

Approved rules:

- Only a buyer from a **Completed Throve transaction** may review that transaction's seller.
- One review is allowed per completed transaction.
- Rating uses **1–5 stars**.
- Written review/comment is optional.
- The seller's aggregate average rating is displayed.
- The seller's total review count is displayed.
- Individual reviews are viewable from the Seller Profile.
- Sellers with no reviews display **“No reviews yet.”**
- A buyer is offered the ability to leave a review after the relevant order reaches **Completed**.

Not included in the prototype:

- Seller responses to reviews.
- Review likes.
- Review photos or videos.
- Complex review sorting.
- Review editing.
- Review disputes.
- Complex review moderation.
- Separate review analytics.

Reviews are transaction-based feedback and are not public comments on product listings.

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
- Short introduction to Throve.
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
- App-initialisation error.
- Offline/connection problem.

### Definition of done
A signed-out user can clearly identify and successfully open both Create Account and Log In.

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

The screen must explain that email verification is required.

Government ID verification, bank verification and production seller verification are not included.

### What the user can do
- Enter required information.
- Submit registration.
- Open Log In if they already have an account.

### Where the user can go next
- Email-verification/magic-link state within registration.
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
A user can submit the four required fields, complete the prototype email-verification flow and continue to Basic Account Setup.

---

## Screen 3 — Log In

### Who uses it
Returning users.

### Prototype status
**INCLUDED**

### Purpose
Allow an existing user to access their account through an email magic link.

### How the user reaches it
- Screen 1 — Welcome.
- Account Recovery when recovery completes.
- Logout followed by returning to login.

### What the user sees
- Email address field.
- Send Magic Link action.
- Account Recovery link.

Apple and Google login remain later options and are not part of the prototype.

### What the user can do
- Enter an email address.
- Request a magic link.
- Open Account Recovery.

### Where the user can go next
- Screen 6 — Home after successful login.
- Screen 4 — Account Recovery.
- Screen 2 — Sign Up.

### Important states
- Default.
- Magic link sending.
- Magic link sent.
- Invalid or unknown email.
- Expired or invalid link.
- Login success.
- Error.
- Offline.

### Definition of done
A registered user can request and use an email magic link to access Throve, with failed or invalid login attempts clearly handled.

---

## Screen 4 — Account Recovery

### Who uses it
Users unable to access an existing account.

### Prototype status
**INCLUDED**

### Purpose
Provide an account-recovery route.

### How the user reaches it
Screen 3 — Log In → Account Recovery.

### What the user sees
- Explanation of account recovery.
- Registered email-address field and Send Recovery Magic Link action.
- Neutral confirmation wording that does not reveal whether the email is registered.

### What the user can do
- Enter the registered email address and request a new magic login link.
- Return to Log In.

### Where the user can go next
- Screen 3 — Log In.
- Recovery success state.

### Important states
- Default.
- Recovery request in progress.
- Recovery instructions sent using neutral wording.
- Recovery failed.
- Recovery success.
- Offline.

### Definition of done
A user can request and use a new magic login link to restore access without the interface revealing whether an entered email belongs to a Throve account.

---

## Screen 5 — Basic Account Setup

### Who uses it
Newly registered users.

### Prototype status
**INCLUDED**

### Purpose
Allow a new user to complete a simple profile before entering the marketplace.

### How the user reaches it
Screen 2 — Sign Up → successful email verification.

### What the user sees
Fields for:

- Profile photograph.
- Username.
- Short bio.
- Location.

The username may already contain the value chosen during Sign Up.

### What the user can do
- Add or change profile photograph.
- Confirm or edit username.
- Add bio.
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
A newly registered user can complete the approved profile information and reach Home with that information saved.

---

# 2. Home and discovery

## Screen 6 — Home

### Who uses it
Signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Act as the main marketplace discovery screen for products, categories, sellers and previews of live-shopping activity.

### How the user reaches it
- Successful Basic Account Setup.
- Successful login.
- Home in the permanent bottom navigation.

### What the user sees
Home may include:

- Prominent Search icon.
- Live Now previews.
- Upcoming Live previews.
- New listings.
- Marketplace discovery/recommended items.
- Department/category discovery.
- Seller discovery where appropriate.

Prototype recommendations may use simple recent, seeded or sample data. An advanced recommendation algorithm is not required.

Permanent bottom navigation:

- Home.
- Live.
- Sell.
- Inbox.
- Profile.

### What the user can do
- Browse products.
- Open Search.
- Open Category Browse.
- Open Product Details.
- Save/favourite a product.
- Open Seller Profile.
- Open Live-Shopping Discovery.
- Open an active live directly from a Live Now preview.
- Use the five permanent navigation items.

### Where the user can go next
- Screen 7 — Category Browse.
- Screen 8 — Search / Search Results.
- Screen 9 — Product Details.
- Screen 10 — Seller Profile.
- Screen 11 — Create Listing through Sell.
- Screen 16 — Inbox.
- Screen 27 — Live-Shopping Discovery.
- Screen 28 — Live-Shopping Viewer from an active live preview.
- Screen 32 — My Profile.

### Important states
- Loading.
- No new listings.
- No Live Now sessions.
- No Upcoming Lives.
- Product-load error.
- Live-content error.
- Offline.
- Available product.
- Reserved product where appropriate.
- Sold product where social/seller context requires it.

### Search entry component

The Search icon is a component of Home rather than a separate screen.

Tapping it opens:

**Screen 8 — Search / Search Results**

### Definition of done
Home is complete when users can discover marketplace content, open Search from the prominent search control, reach Live through both previews and the permanent Live tab, and use the approved Home/Live/Sell/Inbox/Profile navigation without broken routes.

---

## Screen 7 — Category Browse

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Allow users to browse products through the approved Department and Category hierarchy.

### How the user reaches it
- Screen 6 — Home → category/department discovery.
- Screen 8 — Search / Search Results where appropriate.

### What the user sees

#### Main Department controls

- All.
- Women.
- Men.
- Kids.

**All** is a browsing scope and not a stored listing classification.

#### Women

When Women is selected:

- All.
- Clothing.
- Shoes.
- Bags.
- Accessories.
- Beauty.

#### Men

When Men is selected:

- All.
- Clothing.
- Shoes.
- Bags.
- Accessories.
- Grooming.

#### Kids

When Kids is selected:

- All.
- Clothing.
- Shoes.
- Bags.
- Accessories.

The UI uses **Kids**, not Children.

Unisex is not included.

### What the user can do
- Select a Department.
- Select a relevant Category.
- Use All as a browsing scope.
- Browse Available listings.
- Open Product Details.
- Move into Search where additional approved filters or sorting are required.

### Where the user can go next
- Screen 8 — Search / Search Results.
- Screen 9 — Product Details.
- Screen 6 — Home.

### Important states
- Loading.
- Department selected.
- Category selected.
- All scope selected.
- Category has listings.
- Empty category.
- Error.
- Offline.
- Reserved/Sold listings normally excluded from available browsing.

### Department/Category controls

Department and Category controls are components of this screen and are not separate numbered screens.

Filters and Sorting remain implemented through the approved Search/Search Results filtering component unless an already-approved wireframe uses the same embedded component here. No additional Filters screen should be created.

### Definition of done
Users can browse All, Women, Men and Kids; select only valid subcategories for the selected Department; see Kids rather than Children; and open the correct products without storing All as a product classification.

---

# 3. Search and filters

## Screen 8 — Search / Search Results

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Allow users to search approved marketplace content and narrow product results through approved filters and sorting.

### How the user reaches it
- Prominent Search icon on Screen 6 — Home.
- Search controls in other appropriate discovery areas.
- Screen 7 — Category Browse where useful.

Search does **not** depend on a permanent bottom-navigation tab.

### What the user sees
Search may cover:

- Products.
- Brands.
- Sellers.
- Categories where appropriate.

Search results display matching products and appropriate seller/category results.

### What the user can do
- Enter or change a search.
- Open Product Details.
- Open Seller Profile.
- Open Filters and Sorting.
- Clear the search.

### Where the user can go next
- Screen 7 — Category Browse.
- Screen 9 — Product Details.
- Screen 10 — Seller Profile.
- Screen 6 — Home.

### Important states
- Default search.
- Searching.
- Results found.
- No Results.
- Error.
- Offline.
- Available results.
- Reserved listings normally excluded from normal available product results.
- Sold listings excluded from normal available product results.

### Filters and Sorting component

Filters and Sorting are merged into Search / Search Results and are not counted as another screen.

Approved product filters:

- Department.
- Category.
- Brand.
- Size.
- Condition.
- Price.

Department and Category must remain distinct.

Example:

**Department:** Women  
**Category:** Shoes

Department filter browsing scopes may include All, Women, Men and Kids.

All is not stored as a listing classification.

Category choices should correspond to the selected Department.

Approved sorting:

- Newest.
- Lowest price.
- Highest price.

The component must provide:

- Apply Filters.
- Clear Filters.
- Close.

It may be implemented as a bottom sheet, panel, overlay or modal.

### Definition of done
Search is complete when users can access it without a permanent Search tab, search approved content, filter using Department and Category plus the other approved filters, apply/clear sorting and filters, see No Results, and open matching products or sellers.

---

# 4. Product details

## Screen 9 — Product Details

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Show the full approved information about one listing and provide buying, saving, offer and seller-contact actions.

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
- Department.
- Category.
- Brand.
- Colour if supplied.
- Size where relevant.
- Condition.
- Description.
- Shipping information.
- Listing status: Available, Reserved or Sold.
- Saved/favourite state.

Seller information area includes:

- Seller username/profile identity.
- Seller average star rating where reviews exist.
- Seller total review count.
- **No reviews yet** when the seller has no reviews.

There are no public product-listing comments.

### What the user can do

When **Available**:

- Save/favourite.
- Remove from Saved.
- Message seller.
- Open Seller Profile.
- Make Offer.
- Buy Now.

When **Reserved**:

- View listing.
- View seller.
- Save where appropriate.
- Message seller.
- Cannot successfully purchase during the reservation.

When **Sold**:

- View listing where surfaced.
- View Seller Profile.
- Cannot buy or make a new purchase offer.

### Where the user can go next
- Screen 10 — Seller Profile.
- Screen 15 — Saved Items.
- Screen 18 — Offer Details after submitting an offer.
- Screen 19 — Chat Conversation.
- Screen 20 — Shipping Details after Buy Now begins checkout.

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
- Seller has rating/reviews.
- Seller has no reviews.
- Offline.

### Make Offer component

Make Offer remains a component/modal rather than a numbered screen.

It shows:

- Listing price.
- Offer amount.
- Validation that the buyer offer is below listing price.
- Initial lower limit of approximately 50% of listing price.
- Submit.
- Cancel.

No separate offer-message field is included.

### Definition of done
Product Details is complete when users can understand the listing's Department, Category and status; see the seller's rating/review summary or No reviews yet; save the item; contact the seller; make an eligible offer; and start checkout only when the listing is eligible.

---

# 5. Seller profiles

## Screen 10 — Seller Profile

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Show public seller information, listings, relevant live-shopping activity and transaction-based seller reviews.

### How the user reaches it
- Product Details.
- Search results.
- Home seller discovery.
- Chat.
- Live-Shopping Discovery.
- Live-Shopping Viewer.

### What the user sees
A Seller Profile may show:

- Profile photograph.
- Username.
- Bio.
- Location.
- Average star rating.
- Total review count.
- Active listings.
- Sold listings.
- Relevant live-shopping activity.
- Live Now or Upcoming Live information where relevant.

When the seller has no completed-transaction reviews:

**No reviews yet.**

Private information such as email, telephone number and home address is not displayed.

### What the user can do
- View Available listings.
- View Reserved/Sold listings where retained.
- Open Product Details.
- Message seller.
- Open seller reviews.
- Enter an active live session.
- View relevant Upcoming Live activity.

Following sellers is not an approved prototype feature.

### Where the user can go next
- Screen 9 — Product Details.
- Screen 19 — Chat Conversation.
- Screen 27 — Live-Shopping Discovery.
- Screen 28 — Live-Shopping Viewer.

### Important states
- Loading.
- No active listings.
- No sold listings.
- No live activity.
- Seller currently live.
- Seller has reviews.
- No reviews yet.
- Review list loading.
- Review list error.
- Error.
- Offline.

### Seller Reviews component

Seller Reviews are a component, panel, modal, bottom sheet or embedded section of Seller Profile and are not another numbered screen.

Each individual review shows:

- Buyer username/profile identity as appropriate.
- 1–5 star rating.
- Optional written review.
- Date.

The component does not include:

- Seller replies.
- Review likes.
- Review photos/videos.
- Complex sorting.
- Review editing.
- Review disputes.
- Review analytics.

### Definition of done
Seller Profile is complete when approved public seller information, listings, live activity, average rating and review count display correctly; individual reviews can be opened; No reviews yet appears when appropriate; and private seller information remains hidden.

---

# 6. Create and manage listings

## Screen 11 — Create Listing

### Who uses it
Sellers. Every normal Throve account may sell.

### Prototype status
**INCLUDED**

### Purpose
Allow a user to create a marketplace listing using the approved listing fields and Department/Category structure.

### How the user reaches it
Sell in the permanent bottom navigation → Create Listing.

Approved live hosts may also see a **Go Live** entry from the Sell area.

### What the user sees

#### Photo controls

- Up to 8 photographs.
- First photograph is the main listing image.
- Photographs can be reordered.

#### Required listing information

- At least one photograph.
- Item title.
- Department.
- Category.
- Condition.
- Price.
- Brand.
- Description.
- Shipping information.

Size is required when relevant to the selected product Category.

Colour may be included where appropriate.

#### Department choices

- Women.
- Men.
- Kids.

**All is not available as a stored listing Department.**

#### Category choices

When Department = Women:

- Clothing.
- Shoes.
- Bags.
- Accessories.
- Beauty.

When Department = Men:

- Clothing.
- Shoes.
- Bags.
- Accessories.
- Grooming.

When Department = Kids:

- Clothing.
- Shoes.
- Bags.
- Accessories.

**All is not available as a stored listing Category.**

Condition options:

- New with tags.
- New without tags.
- Very good.
- Good.
- Satisfactory.

Suggested limits:

- Title: approximately 80 characters.
- Description: approximately 1,000 characters.

### What the user can do
- Add photographs.
- Reorder photographs.
- Select Department.
- Select a valid Category for that Department.
- Enter approved listing information.
- Save as Draft.
- Preview.
- Continue editing.
- Cancel.

### Where the user can go next
- Screen 12 — Listing Preview.
- Screen 13 — My Listings after saving a draft.
- Screen 29 — Live-Hosting Access if a non-approved user chooses Go Live.
- Screen 30 — Prepare / Schedule Live if an approved host chooses Go Live.

### Important states
- Empty form.
- Partially completed.
- Draft saved.
- Photo uploading.
- Required field missing.
- Invalid Department/Category combination.
- Category disabled until Department is selected where appropriate.
- Image upload error.
- Save error.
- Offline.
- Go Live access permitted.
- Go Live access denied.

### Definition of done
A seller can create a listing with the approved fields, add and reorder up to eight photographs, choose only a valid Department/Category combination, never store All as classification, save a draft and reach Preview when required information is valid.

---

## Screen 12 — Listing Preview

### Who uses it
Seller creating or editing a listing.

### Prototype status
**INCLUDED**

### Purpose
Show how the listing will appear before publication.

### How the user reaches it
Screen 11 — Create Listing → Preview.

### What the user sees
Preview of:

- Main photograph and additional photographs.
- Title.
- Price.
- Department.
- Category.
- Brand.
- Colour if supplied.
- Size where relevant.
- Condition.
- Description.
- Shipping information.

### What the user can do
- Return to edit.
- Publish.
- Save as Draft.

### Where the user can go next
- Screen 11 — Create Listing.
- Screen 13 — My Listings after publish/save.
- Screen 9 — Product Details after successful publication.

### Important states
- Preview ready.
- Missing required information.
- Invalid Department/Category combination.
- Publishing.
- Publish success.
- Publish error.
- Offline.

### Definition of done
The preview accurately reflects the seller's information including Department and Category, and Publish creates one correctly classified listing.

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
- Seller/account routes after creating a listing.

### What the user sees
Listings grouped or labelled by relevant state:

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
- Draft.
- Available.
- Reserved.
- Sold.
- Hidden.
- Error.
- Offline.

### Definition of done
The seller can see all prototype listings with the correct state and open each listing for viewing or management.

---

## Screen 14 — Seller Listing Management

### Who uses it
Seller who owns the listing.

### Prototype status
**INCLUDED**

### Purpose
Allow a seller to edit/manage an individual listing and view interested buyers.

### How the user reaches it
Screen 13 — My Listings → manage listing.

### What the user sees
- Current listing information.
- Department.
- Category.
- Current status.
- Edit controls.
- Deactivate/hide.
- Delete when no active transaction exists.
- Manual Mark as Sold.
- Interested Buyers component.

Relisting is not required.

### What the user can do
- Edit permitted information.
- Save changes.
- Maintain a valid Department/Category classification.
- Deactivate/hide.
- Delete where permitted.
- Mark Sold.
- View users who saved the item.
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
- Invalid classification prevented.
- Error.
- Offline.

### Interested Buyers component

Not a separate screen.

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
- Buyer can block the seller.

### Definition of done
The seller can safely manage the listing, preserve valid classification, see only approved interested-buyer information and send an allowed message or offer without exposing private buyer details.

---

# 7. Saved items and interested buyers

## Screen 15 — Saved Items

### Who uses it
Signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Allow users to view products they have saved/favourited.

### How the user reaches it
- Profile/account routes.
- Product-saving interactions.

### What the user sees
Saved products with:

- Main image.
- Title.
- Price.
- Condition.
- Seller.
- Current status.

### What the user can do
- Open Product Details.
- Remove from Saved.
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
Users can save and unsave products and Saved Items accurately reflects each listing's current availability.

---

# 8. Offers

## Screen 16 — Inbox

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Provide the permanent navigation destination for private conversations and access to Offers.

### How the user reaches it
Inbox in the permanent bottom navigation.

### What the user sees
- Conversations area.
- Offers area.
- Unread/read indicators where available.

Offers are not another permanent bottom-navigation destination.

Permanent navigation remains:

- Home.
- Live.
- Sell.
- Inbox.
- Profile.

### What the user can do
- Open a conversation.
- Open Offers.
- Use normal bottom navigation.

### Where the user can go next
- Screen 17 — Offers Centre.
- Screen 19 — Chat Conversation.
- Other permanent navigation destinations.

### Important states
- Loading.
- No conversations.
- No offers.
- Unread conversation.
- Error.
- Offline.

### Definition of done
Users can access conversations and Offers from Inbox and navigate using the approved Home/Live/Sell/Inbox/Profile structure.

---

## Screen 17 — Offers Centre

### Who uses it
Buyers and sellers.

### Prototype status
**INCLUDED**

### Purpose
Show offers the user has sent or received within Inbox.

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
- Open related product.
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
Users can see the current status of every relevant prototype offer and open the associated offer, product or conversation.

---

## Screen 18 — Offer Details

### Who uses it
Buyer or seller involved in an offer.

### Prototype status
**INCLUDED**

### Purpose
Show the full offer state and allow permitted offer actions.

### How the user reaches it
- Screen 17 — Offers Centre.
- Make Offer component after submission.
- Seller Listing Management after seller sends an offer.
- Chat where appropriate.

### What the user sees
- Product.
- Listing price.
- Current offer price.
- Buyer and seller usernames.
- Offer expiry.
- Current status.
- Relevant actions.

### What the user can do

Buyer:

- View sent offer.
- Withdraw before acceptance.
- Accept/reject seller counter-offer where applicable.
- Proceed toward purchase after an accepted active price.

Seller:

- Accept.
- Reject.
- Counter-offer.

Both can open Chat.

Multiple users may have active offers on the same listing.

Accepting an offer does **not** reserve or sell the item.

Checkout begins → **Reserved**.

Successful simulated purchase → **Sold**.

Only one buyer may complete the purchase.

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
- Product Reserved by another checkout.
- Product Sold to another buyer.
- Action disabled when no longer valid.
- Error.
- Offline.

### Definition of done
Buyers and sellers can perform the approved offer actions, invalid/expired offers cannot be acted upon and an accepted offer does not incorrectly reserve or sell the item.

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
Conversation may begin from:

- Product listing.
- Seller Profile.
- Offer.
- Interested Buyer interaction.
- Inbox.

### What the user sees
- Other participant's username/profile information.
- Related product where relevant.
- Text-message history.
- Sent state.
- Read state where implemented.
- Block User.
- Report User.
- Report Message.

Messages are text only.

### What the user can do
- Send text.
- Read messages.
- Open related product.
- Open related offer.
- Block user.
- Report user.
- Report message.

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
- Loading.
- No messages yet.
- Sending.
- Sent.
- Read.
- Send failed.
- User blocked.
- Report submitted.
- Access denied.
- Offline.

Read receipts may be postponed if they create unnecessary prototype complexity without changing the core chat journey.

### Definition of done
Two authorised participants can exchange private text messages, unauthorised users cannot read them and Block/Report actions are testable.

---

# 10. Simulated checkout

All checkout screens must clearly communicate:

**“Prototype purchase — no real money will be charged.”**

Starting checkout reserves an Available item for approximately **10 minutes**.

If checkout expires or is abandoned:

→ listing returns to **Available**.

---

## Screen 20 — Shipping Details

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Collect temporary delivery information for the simulated purchase.

### How the user reaches it
- Screen 9 — Product Details → Buy Now.
- Eligible accepted-offer purchase route.
- Screen 28 — Live-Shopping Viewer after an active Claim/Buy Now.

### What the user sees
- Reserved-item notice/countdown where appropriate.
- Test/demo shipping-address fields.
- Prototype/no-real-money notice.

During early testing:

- Use test/demo addresses.
- Do not encourage unnecessary sensitive personal information.
- Do not permanently save addresses to the account.

### What the user can do
- Enter test/demo shipping information.
- Continue.
- Cancel checkout.

### Where the user can go next
- Screen 21 — Delivery Method.
- Previous product/live context if checkout is cancelled where appropriate.

### Important states
- Reserved.
- Reservation countdown.
- Address incomplete.
- Saving/validation.
- Reservation expired → Available.
- Item no longer available.
- Error.
- Offline.

### Definition of done
The buyer can enter valid test/demo shipping information without permanently saving it, while the active reservation prevents a second successful purchase.

---

## Screen 21 — Delivery Method

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Allow the buyer to select the delivery method used for the simulated purchase.

### How the user reaches it
Screen 20 — Shipping Details → Continue.

### What the user sees
- Reservation/countdown.
- **Standard Delivery — ₦2,500 — estimated 2–5 working days.**
- **Express Delivery — ₦4,000 — estimated 1–2 working days.**
- Clear indication that these are simulated prototype/demo choices and charges.

No real courier quote, distance calculation or package-weight calculation is required.

### What the user can do
- Select an available delivery method.
- Continue.
- Go back.

### Where the user can go next
- Screen 22 — Checkout Summary.
- Screen 20 — Shipping Details.

### Important states
- No method selected.
- Method selected.
- Method unavailable.
- Loading.
- Reservation expired.
- Error.
- Offline.

### Definition of done
The screen is complete when the approved prototype delivery choices can be selected and the selected method appears correctly in Checkout Summary.

---

## Screen 22 — Checkout Summary

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Give the buyer a final review before simulated payment.

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
- No-real-money notice.

The simulated total is **item price + selected fixed prototype delivery charge**: ₦2,500 for Standard Delivery or ₦4,000 for Express Delivery.

### What the user can do
- Review.
- Return to Shipping Details.
- Return to Delivery Method.
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
The buyer can confirm the correct item, seller, delivery details, delivery method and simulated total before continuing, with the prototype notice clearly visible.

---

## Screen 23 — Simulated Payment

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Demonstrate the payment stage without collecting real money.

### How the user reaches it
Screen 22 — Checkout Summary → Continue.

### What the user sees
- Prototype/no-real-money notice.
- Simulated purchase amount.
- Complete Simulated Payment control.
- No real card, bank or payment-provider collection.

### What the user can do
- Complete simulated payment.
- Return to Checkout Summary before completion.

### Where the user can go next
- Screen 24 — Order Confirmation after success.
- Screen 22 — Checkout Summary.

### Important states
- Ready.
- Processing.
- Purchase success.
- Simulated payment failure.
- Reservation expired.
- Product unavailable.
- Error/offline.

On successful simulated payment:

- Listing becomes **Sold**.
- No real money is charged.
- No seller payout occurs.

### Definition of done
Simulated payment succeeds or fails in a testable way, never requests real payment data and changes a unique listing to Sold exactly once after success.

---

## Screen 24 — Order Confirmation

### Who uses it
Buyer.

### Prototype status
**INCLUDED**

### Purpose
Confirm successful creation of the simulated purchase.

### How the user reaches it
Screen 23 — successful Simulated Payment.

### What the user sees
- Purchase successful.
- Clear statement that no real money was charged.
- Purchased item.
- Seller.
- Simulated delivery information.
- Order reference.
- Order Details link.
- Return-to-Live route where relevant and still active.

### What the user can do
- Open Order Details.
- Return Home.
- Message seller.
- Return to active live session when applicable.

### Where the user can go next
- Screen 26 — Order Details.
- Screen 19 — Chat Conversation.
- Screen 6 — Home.
- Screen 28 — Live-Shopping Viewer where applicable.

### Important states
- Order being created.
- Success.
- Order creation error.
- Live session active.
- Live session ended.

### Definition of done
A successful simulated purchase creates a single order reference, clearly confirms no money was charged and offers working onward routes.

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
Differentiated views for:

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

“Paid” means simulated prototype purchase success. No real money was collected.

### What the user can do
- Open an order.
- Switch between purchase/sale views.
- Open related product or chat where appropriate.

### Where the user can go next
- Screen 26 — Order Details.
- Screen 19 — Chat Conversation.
- Screen 9 — Product Details.

### Important states
- Loading.
- No purchases.
- No sales.
- Paid.
- Awaiting dispatch.
- Dispatched.
- In transit.
- Delivered.
- Completed.
- Cancelled.
- Error.
- Offline.

### Definition of done
The account owner can see prototype purchases and sales with correct statuses without separate buyer and seller account types.

---

## Screen 26 — Order Details

### Who uses it
Buyer or seller involved in an order.

### Prototype status
**INCLUDED**

### Purpose
Show a prototype order, delivery progress, buyer/seller actions and the eligible post-transaction seller-review action.

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
- Basic/simulated tracking where present.
- Clear prototype/no-real-payment indication.

When the buyer's order reaches **Completed**:

- Leave Seller Review action, if that transaction has not already been reviewed.
- Review submitted state if a review has already been left.

### What the user can do

#### Buyer

- View delivery progress.
- Message seller.
- Cancel order while the order is **Paid** or **Awaiting dispatch**.
- Confirm **Item received** when appropriate.
- Leave one seller review after Completed.

#### Seller

- View sale.
- Message buyer.
- Cancel order while the order is **Paid** or **Awaiting dispatch**.
- Mark order as dispatched.
- Enter basic/simulated tracking information.

Seller Shipping Update remains merged into this screen.

### Where the user can go next
- Screen 19 — Chat Conversation.
- Screen 9 — Product Details.
- Screen 25 — Orders.
- Screen 10 — Seller Profile after reviewing/viewing seller information.

### Important states
- Paid.
- Awaiting dispatch.
- Dispatched.
- In transit.
- Delivered.
- Completed.
- Cancelled.
- Cancel Order available while Paid or Awaiting dispatch.
- Cancel Order disabled/unavailable from Dispatched onward.
- Tracking absent/present.
- Updating shipping.
- Buyer receipt confirmation successful.
- Leave Review unavailable before Completed.
- Leave Review available after Completed.
- Review submitting.
- Review submitted.
- Review already submitted/disabled.
- Review submission error.
- Error.
- Offline.

Buyer confirmation:

- Buyer taps **Item received** when appropriate.
- Order moves toward **Completed**.

There is no seller payout because no real money exists in the prototype.

Either buyer or seller may cancel while the order is **Paid** or **Awaiting dispatch**. Cancellation is unavailable after **Dispatched**. A successful pre-dispatch cancellation changes the order to **Cancelled** and automatically returns the listing to **Available**. No refund process is required because no real money was collected.

### Leave Seller Review component

This interaction is a modal, bottom sheet, panel or state within Order Details and is not a separate numbered screen.

Eligibility:

- Order must be **Completed**.
- Signed-in user must be the buyer for that transaction.
- No review may already exist for that transaction.

The interaction allows:

- 1–5 star rating.
- Optional written comment.
- Submit.
- Cancel.

After successful submission:

- Review is associated with that completed transaction.
- Buyer cannot submit another review for the same transaction.
- Seller aggregate average rating updates.
- Seller review count updates.
- Review becomes visible in the Seller Reviews component on Screen 10.

Not included:

- Review editing.
- Seller response.
- Review likes.
- Photos/videos.
- Review disputes.
- Complex moderation.
- Review analytics.

### Definition of done
Buyer and seller see the correct order view; either party can cancel only while Paid or Awaiting dispatch; a valid cancellation changes the order to Cancelled and returns the listing to Available; cancellation is unavailable from Dispatched onward; seller can record dispatch/tracking; buyer can confirm receipt; and after Completed the buyer can submit exactly one valid seller review that updates the seller's rating/count and becomes visible on Seller Profile.

---

# 12. Live-shopping discovery

## Screen 27 — Live-Shopping Discovery

### Who uses it
All signed-in users.

### Prototype status
**INCLUDED**

### Purpose
Serve as Throve's permanent main Live destination, allowing users to discover active and upcoming live-shopping sessions.

### How the user reaches it
- **Live** in the permanent bottom navigation.
- Screen 6 — Home through Live Now or Upcoming Live discovery.
- Screen 10 — Seller Profile through relevant live activity.
- Other approved live-discovery links where appropriate.

### What the user sees
- Live Now sessions.
- Upcoming Lives.
- Host/seller information.
- Cover image/thumbnail where available.
- Live title/category where available.
- Active-session indicators.

### What the user can do
- Open an active Live Now session.
- View Upcoming Lives.
- Open the relevant Seller Profile.
- Use the normal app navigation.
- Return Home or move to another permanent navigation destination.

### Where the user can go next
- Screen 28 — Live-Shopping Viewer.
- Screen 10 — Seller Profile.
- Screen 6 — Home.
- Sell, Inbox or Profile through permanent bottom navigation.

### Important states
- Loading.
- No Live Now sessions.
- No Upcoming Lives.
- Session Live.
- Session ended.
- Error.
- Offline.

### Definition of done
Screen 27 is complete when tapping the permanent Live bottom-navigation item opens it, users can see Live Now and Upcoming Lives, enter an active real-video session, open the relevant seller and navigate normally through the app.

---

# 13. Live-shopping viewer experience

## Screen 28 — Live-Shopping Viewer

### Who uses it
Signed-in viewers/buyers.

### Prototype status
**INCLUDED**

### Purpose
Allow users to watch real live video, participate through comments, view the featured product and claim/buy it through simulated checkout.

### How the user reaches it
- Screen 27 — Live-Shopping Discovery.
- Screen 6 — Home active Live card.
- Screen 10 — Seller Profile when the seller is live.

### What the user sees
- Real live video.
- Host username/profile.
- Link to Seller Profile.
- Text-only live comments.
- Comment entry.
- Featured/pinned product.
- Product image.
- Product name.
- Size where relevant.
- Condition.
- Price.
- Claim.
- Buy Now.
- Report controls.
- Leave Live.

Public comments are allowed here but not on ordinary product pages.

### What the user can do
- Watch real live video.
- Open host profile.
- Read comments.
- Add a text comment.
- View featured product.
- Claim featured product.
- Buy through simulated checkout.
- Report live.
- Report user.
- Report listing.
- Leave the session.

### Where the user can go next
- Screen 10 — Seller Profile.
- Screen 20 — Shipping Details after Claim/Buy Now.
- Screen 27 — Live-Shopping Discovery.
- Screen 6 — Home.

After a successful live-origin purchase, the buyer may return to this screen if the live session is still active.

### Important states

#### Video
- Connecting.
- Live.
- Connection lost.
- Reconnecting.
- Session ended.
- Reconnection failed.

Connection-loss message:

**“Connection lost — reconnecting…”**

If reconnection ultimately fails:

- End viewing gracefully.
- Provide route to Screen 27 or Seller Profile.

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
- No product pinned.

#### Live claim

Seller pins item  
→ viewer taps Claim  
→ listing becomes Reserved  
→ approximately 5-minute claim countdown  
→ viewer proceeds through simulated checkout  
→ successful simulated purchase changes item to Sold  
→ live visibly displays **SOLD**

If claim expires:

→ listing returns to Available.

### Definition of done
A viewer can enter from the permanent Live journey or Home shortcut, watch real video, comment, see and claim a featured product, complete simulated checkout, see Sold after success and return to the active live where applicable.

---

# 14. Live-shopping host experience

## Screen 29 — Live-Hosting Access

### Who uses it
Seller who is not approved to host.

### Prototype status
**INCLUDED**

### Purpose
Explain the invite-only restriction when a non-approved user tries to Go Live.

### How the user reaches it
Sell → Go Live when the account lacks host approval.

### What the user sees
- Clear invite-only/approval-only explanation.
- No complex host application.

Host approval is administrator-controlled.

Technical approval flags must not be exposed in the UI.

### What the user can do
- Return to Sell.
- Return Home/Profile.

### Where the user can go next
- Screen 11 — Create Listing / Sell area.
- Screen 6 — Home.
- Screen 32 — My Profile.

### Important states
- Access denied/not approved.
- Loading approval status.
- Approval-check error.
- Offline.

### Definition of done
A non-approved user cannot start a live and receives a clear non-technical explanation.

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
- Select listings.
- Choose scheduled time where applicable.
- Check camera/microphone.
- Start Live.
- Cancel.

### Where the user can go next
- Screen 31 — Live Host Broadcast.
- Sell/Home if cancelled.

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
An approved host can enter the approved live information, select products, satisfy permissions and successfully start real live video.

---

## Screen 31 — Live Host Broadcast

### Who uses it
Approved live host.

### Prototype status
**INCLUDED**

### Purpose
Allow the seller to run the live session, present products and demonstrate basic moderation.

### How the user reaches it
Screen 30 — Prepare / Schedule Live → Start Live.

### What the user sees
- Live camera.
- Live status.
- Viewer comments.
- Product/listing controls.
- Currently pinned product.
- Product status.
- Viewer/comment moderation controls.
- End Live.

### What the user can do
- Broadcast.
- Read comments.
- Select/pin product.
- Move to another product.
- Remove inappropriate comment where practical.
- Remove/mute disruptive viewer where practical.
- End Live.

When a viewer successfully completes simulated purchase:

- Product changes to Sold.
- Host view visibly shows **SOLD**.
- Host can move to next item.

### Where the user can go next
- Ended-live state.
- Screen 27 — Live-Shopping Discovery.
- Screen 6 — Home.
- Screen 10 — Seller Profile where relevant.

### Important states
- Starting.
- Live.
- No viewers.
- No comments.
- Product Available.
- Product Reserved by claim.
- Product Sold.
- Connection lost.
- Reconnecting.
- Permission lost.
- Ending.
- Ended.
- Reconnection failed.

If reconnection permanently fails:

- End session gracefully.

After host ends:

- Show Live ended confirmation.
- Simple session summary may appear if useful.
- No complex live analytics.

### Definition of done
An approved host can start/end real live video, pin products, see claim/Sold status, view comments and demonstrate approved moderation without unapproved advanced live functionality.

---

# 15. User profile and settings

## Screen 32 — My Profile

### Who uses it
Signed-in account owner.

### Prototype status
**INCLUDED**

### Purpose
Show the user's own profile and provide access to buying, selling and account activity.

### How the user reaches it
Profile in the permanent bottom navigation.

### What the user sees
- Profile photograph.
- Username.
- Bio.
- Location.
- Active listings.
- Sold listings.
- Relevant live-shopping activity.
- Routes to account areas.

One account supports buying and selling.

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
- Screen 27/28 where relevant live activity is available.
- Screen 33 — Edit Profile.
- Screen 34 — Settings and Account.

### Important states
- Loading.
- No active listings.
- No sold listings.
- No live activity.
- Profile incomplete.
- Error.
- Offline.

### Definition of done
The account owner can view approved profile information and reach listings, Saved Items, Orders and account management while using the approved Home/Live/Sell/Inbox/Profile navigation.

---

## Screen 33 — Edit Profile

### Who uses it
Signed-in account owner.

### Prototype status
**INCLUDED**

### Purpose
Allow the user to update approved editable profile information.

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
Approved profile fields can be changed and saved and appear correctly on the profile.

---

## Screen 34 — Settings and Account

### Who uses it
Signed-in account owner.

### Prototype status
**INCLUDED**

### Purpose
Provide approved account, security and user-control settings.

### How the user reaches it
Screen 32 — My Profile → Settings and Account.

### What the user sees
- Edit Profile.
- Account details.
- Login/security.
- Blocked users.
- Logout.
- Delete account.

Advanced privacy controls remain later-version functionality unless separately approved.

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

Delete Account means **account deactivation** for the prototype and requires explicit confirmation. The user is logged out, normal access is disabled and active listings are hidden/deactivated. Records needed to preserve transaction, order, review and marketplace integrity may be retained. Production deletion, anonymisation and retention require later privacy, legal and technical review.

### Definition of done
The approved settings are accessible, logout works, blocked-user management is visible and Delete Account cannot be triggered accidentally.

---

# 16. Later-version screens

These areas are intentionally outside the active prototype.

They use **L-numbering** and are not included in the 34-screen prototype count.

---

## Later Screen L1 — Real Payment Checkout

### Who uses it
Buyer.

### Prototype status
**LATER VERSION**

### Purpose
Collect real money through an approved production payment provider.

### How the user reaches it
Future production checkout.

### What the user sees
Real payment method, transaction amount and approved fees.

### What the user can do
Complete a real payment.

### Where the user can go next
Production order confirmation.

### Important states
Payment pending, successful, failed, reversed or other future payment-provider states.

### Definition of done
Not applicable to prototype approval. Requires separate production payment/security review.

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
Users requiring future production verification.

### Prototype status
**LATER VERSION**

### Purpose
Support future government-ID, bank or production seller-verification requirements.

### How the user reaches it
Future verification flow.

### What the user sees
Future approved verification requirements.

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
Courier, label and real tracking information.

### What the user can do
Use approved production shipping services.

### Where the user can go next
Order/tracking details.

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
Support auction-style selling if separately approved.

### How the user reaches it
Future live-shopping experience.

### What the user sees
**To be decided.**

### What the user can do
**To be decided.**

### Where the user can go next
**To be decided.**

### Important states
**To be decided.**

### Definition of done
Not defined because auctions are excluded from the first prototype.

---

## Later Screen L7 — Advanced Live Features

### Who uses it
Future hosts and viewers.

### Prototype status
**LATER VERSION**

### Purpose
Hold future live functionality such as:

- Live gifting.
- Paid gifts.
- Multi-host sessions.
- Creator commissions.
- Complex giveaways.

### How the user reaches it
Future live-shopping screens.

### What the user sees
**To be decided.**

### What the user can do
**To be decided.**

### Where the user can go next
**To be decided.**

### Important states
**To be decided.**

### Definition of done
Requires separate approval and is not part of prototype completion.

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
Product or Seller Profile.

### Important states
Loading, no recommendations, error.

### Definition of done
Not required for prototype approval; simple seeded/recent/sample discovery is sufficient.

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
Future approved seller-performance information.

### What the user can do
Review analytics.

### Where the user can go next
Future seller/listing tools.

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
Support real-money listing boosts, promotion tools or subscriptions if approved.

### How the user reaches it
Future seller tools.

### What the user sees
Approved prices, plans or boost options.

### What the user can do
Purchase/manage future promotion or subscription.

### Where the user can go next
Future real payment flow.

### Important states
Inactive, pending, active, expired, failed.

### Definition of done
Requires separate business-model and real-payment approval.

---

## Later Screen L11 — International, Currency and Language Settings

### Who uses it
Future users outside the Nigeria-only scope.

### Prototype status
**LATER VERSION**

### Purpose
Support future international buying/selling, currencies and languages.

### How the user reaches it
Future marketplace/account settings.

### What the user sees
**To be decided.**

### What the user can do
**To be decided.**

### Where the user can go next
**To be decided.**

### Important states
**To be decided.**

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
**To be decided.**

### What the user can do
**To be decided.**

### Where the user can go next
**To be decided.**

### Important states
**To be decided.**

### Definition of done
Requires a separate product and operational decision.

---

## Later Screen L13 — Advanced Moderation and Admin

### Who uses it
Authorised Throve administrators/moderators.

### Prototype status
**LATER VERSION**

### Purpose
Provide production-scale moderation and administration.

### How the user reaches it
Future protected administrator interface.

### What the user sees
**To be decided.**

### What the user can do
**To be decided.**

### Where the user can go next
**To be decided.**

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
Add, edit, select or delete saved addresses.

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
- Seller ratings and reviews.
- Real payments.
- Seller payouts.
- Refunds.
- Chargebacks.
- Order security.
- Live-video permissions.
- Admin access.

Prototype checks must confirm at minimum:

- Private chats are only visible to authorised participants.
- Users cannot alter another user's private account information.
- Seller cannot access interested buyer's private email, telephone number or home address.
- One unique listing cannot be successfully purchased twice.
- Live-host restrictions cannot be bypassed through normal user controls.
- Admin-only powers are not exposed to normal users.
- A review cannot be submitted before Completed.
- Only the transaction buyer can review the seller.
- Only one review can be submitted for each completed transaction.
- A submitted review updates the correct seller rather than another account.

---

# Final Prototype Screen Count

**34 actual prototype screens**

Prototype numbering remains sequential from **Screen 1 to Screen 34**.

No new numbered screen was added for:

- Search entry.
- Department/Category controls.
- Seller review list.
- Leave Review.
- Category subcategory controls.
- Filters and Sorting.

---

# Merged Components

The following are included in the prototype but are not counted as standalone numbered screens:

1. **Search entry icon**  
   Opens Screen 8 from Screen 6 and other appropriate discovery areas.

2. **Department and Category controls**  
   Embedded in Screen 7 — Category Browse.

3. **Filters and Sorting**  
   Merged into Screen 8 — Search / Search Results.

4. **Interested Buyers**  
   Merged into Screen 14 — Seller Listing Management.

5. **Seller Shipping Update**  
   Merged into Screen 26 — Order Details.

6. **Seller Reviews list**  
   Embedded/presented from Screen 10 — Seller Profile.

7. **Leave Seller Review**  
   Merged into Screen 26 — Order Details after Completed.

8. **Make Offer entry**  
   Modal/component from Screen 9 — Product Details.

9. **Seller offer to interested buyer**  
   Initiated within Screen 14.

10. **Checkout reservation countdown**  
    State/component of the checkout flow.

11. **Live product card / pinned product**  
    Component of Screens 28 and 31.

12. **Live Claim countdown**  
    State/component of Screen 28.

13. **Live comment/report controls**  
    Components of Screens 28 and 31.

14. **Purchase Success**  
    Success state of Screen 23 before Screen 24.

15. **End Live confirmation**  
    Ended state of Screen 31.

16. **Email account verification**  
    Part of Sign Up/email magic-link flow rather than another numbered screen.

---

# Later-Version Screen Count

**15 later-version screen areas are documented.**

They remain labelled **L1–L15** and are not included in the 34-screen prototype count.

Seller ratings and reviews are **not** a later-version screen area; the lightweight approved review feature is part of the prototype.

---

# Resolved Implementation Decisions

The five previously unresolved first-prototype implementation decisions are now approved:

1. Account Recovery uses the registered email address and a new magic login link, with neutral response wording.
2. Standard Delivery is ₦2,500 (2–5 working days); Express Delivery is ₦4,000 (1–2 working days).
3. The simulated total adds the selected fixed demo delivery charge to the item price.
4. Buyer or seller may cancel before dispatch; cancellation is unavailable after Dispatched and automatically returns the listing to Available.
5. Delete Account deactivates prototype access, logs the user out and hides active listings while allowing records needed for transaction/review integrity to be retained.

These decisions do not change the approved 34-screen structure.

---

# Core Journey Coverage Check

## Journey 1 — Account creation → Basic Account Setup → Home

- Screen 1 — Welcome.
- Screen 2 — Sign Up.
- Screen 5 — Basic Account Setup.
- Screen 6 — Home.

**Coverage:** Complete.

---

## Journey 2 — Home/Search → Product → Seller Profile

Routes include:

- Screen 6 — Home.
- Search icon → Screen 8 — Search / Search Results.
- Screen 7 — Category Browse where relevant.
- Screen 9 — Product Details.
- Screen 10 — Seller Profile.

Search no longer requires a permanent bottom-navigation item.

**Coverage:** Complete.

---

## Journey 3 — Sell → Create Listing → Preview → Publish

- Sell permanent bottom-navigation item.
- Screen 11 — Create Listing.
- Screen 12 — Listing Preview.
- Screen 13 — My Listings and/or Screen 9 after successful publication.

Department and Category classification is part of the Create Listing journey.

**Coverage:** Complete.

---

## Journey 4 — Save Item → Seller sees interested buyer → Seller sends message or offer

- Screen 9 — Product Details.
- Screen 15 — Saved Items.
- Screen 14 — Seller Listing Management / Interested Buyers component.
- Screen 19 — Chat Conversation.
- Screen 18 — Offer Details.

**Coverage:** Complete.

---

## Journey 5 — Buyer makes offer → Seller rejects/accepts/counter-offers → Buyer proceeds toward purchase

- Screen 9 — Product Details / Make Offer component.
- Screen 17 — Offers Centre.
- Screen 18 — Offer Details.
- Screen 20 onward when eligible buyer starts purchase.

**Coverage:** Complete.

---

## Journey 6 — Buyer/seller chat → Block/Report

- Screen 16 — Inbox.
- Screen 19 — Chat Conversation.
- Block User.
- Report User.
- Report Message.

**Coverage:** Complete.

---

## Journey 7 — Product → Buy Now → Shipping Details → Checkout Summary → Simulated Payment → Order Confirmation → Order Details

- Screen 9 — Product Details.
- Screen 20 — Shipping Details.
- Screen 21 — Delivery Method.
- Screen 22 — Checkout Summary.
- Screen 23 — Simulated Payment.
- Screen 24 — Order Confirmation.
- Screen 26 — Order Details.

**Coverage:** Complete.

---

## Journey 8 — Seller receives order → Dispatch → Delivery → Buyer confirms receipt → Completed → Seller Review

- Screen 25 — Orders.
- Screen 26 — Order Details.
- Seller Shipping Update component inside Screen 26.
- Simulated delivery-status progression.
- Buyer Item Received action.
- Order reaches Completed.
- Leave Seller Review component.
- Buyer submits one 1–5 star review with optional written comment.
- Seller average/review count updates.
- Screen 10 — Seller Profile displays the review.

Review submission is disabled before Completed and after a review has already been submitted for the transaction.

**Coverage:** Complete.

---

## Journey 9 — Live bottom tab → Live Discovery → Live Viewer → Featured Product → Claim → Simulated Checkout → Sold → Return to Live

Primary route:

- **Live permanent bottom-navigation item.**
- Screen 27 — Live-Shopping Discovery.
- Screen 28 — Live-Shopping Viewer.
- Featured Product component.
- Live Claim component/countdown.
- Screens 20–24 — Simulated Checkout.
- Product becomes Sold.
- Return to Screen 28 when the live session is still active.

Additional shortcut:

- Screen 6 — Home active Live card → Screen 28.

**Coverage:** Complete.

---

## Journey 10 — Approved Seller → Prepare/Schedule Live → Start Live → Pin Product → Moderate → Product claimed/sold → End Live

- Sell permanent bottom-navigation item.
- Screen 30 — Prepare / Schedule Live.
- Screen 31 — Live Host Broadcast.
- Pinned Product component.
- Comment/viewer moderation.
- Reserved/Sold states.
- Ended-live state.

For a non-approved seller:

- Screen 29 — Live-Hosting Access blocks hosting.

**Coverage:** Complete.

---

# Prototype Approval Requirements

The prototype must support all ten approved core journeys before overall prototype approval.

A screen or feature must not be marked complete solely because an AI/coding agent says it is complete.

Evidence may include:

- Founder manual testing.
- Screenshots.
- Screen recordings.
- Relevant automated tests.
- Independent Reviewer Agent review.
- Testing on a physical phone.

During development:

- Regular testing on the founder's own phone is acceptable.
- Known defects and incomplete states must be recorded.
- Relevant loading, empty, error, success, disabled, access-denied and connection states must be tested.

Before overall prototype approval:

- Test on at least one real iPhone.
- Test on at least one real Android device.
- Complete all ten core journeys.
- Verify permanent navigation is Home / Live / Sell / Inbox / Profile.
- Verify Search is accessible without a permanent Search tab.
- Verify Live bottom navigation opens Screen 27.
- Verify Department and Category browsing.
- Verify listings cannot store All as Department or Category.
- Verify Women, Men and Kids use the approved categories.
- Verify Kids appears instead of Children.
- Verify listing Available, Reserved and Sold behaviour.
- Verify checkout reservation behaviour.
- Verify that two buyers cannot successfully obtain the same unique item.
- Verify private chat access controls.
- Verify offers and counter-offers.
- Verify complete simulated checkout.
- Verify buyer and seller order views.
- Verify dispatch/delivery-confirmation behaviour.
- Verify buyer review eligibility only after Completed.
- Verify one review maximum per completed transaction.
- Verify seller rating average and review count update after review.
- Verify Seller Profile displays individual reviews and No reviews yet when appropriate.
- Verify real live video as viewer and host.
- Verify Live Claim and Sold behaviour.
- Verify return to active live after live-origin checkout where applicable.
- Verify live connection-loss handling.
- Resolve all Critical Reviewer findings.
- Record remaining non-critical limitations.

Approximately **5–10 external testers** may later be used for usability testing.

Passing prototype approval does not mean Throve is secure or production-ready for public payments, payouts or sensitive personal information.

---

# Conditions That Prevent Prototype Approval

The prototype must not be approved if any of the following remain unresolved:

- App crashes during a core journey.
- User cannot create/access a prototype account.
- Seller cannot create and publish a listing.
- Department/Category classification allows invalid combinations.
- All can incorrectly be stored as a listing Department or Category.
- User cannot browse/view products.
- Search cannot be reached through the approved discovery controls.
- Permanent bottom navigation does not correctly use Home / Live / Sell / Inbox / Profile.
- Live tab does not open Screen 27.
- Saved/favourite products do not work.
- Core offer/counter-offer behaviour does not work.
- Buyer–seller chat does not work.
- Private messages are visible to unauthorised users.
- Simulated checkout fails.
- Prototype accidentally attempts to collect real money.
- Reservation logic allows conflicting successful purchases.
- Two buyers can successfully obtain the same unique item.
- Orders are not correctly created after simulated purchase.
- Seller dispatch update fails.
- Buyer receipt confirmation fails.
- Buyer can review seller before Completed.
- Someone other than the transaction buyer can review the seller.
- Buyer can submit more than one review for the same transaction.
- Submitted review does not update the correct seller's aggregate rating/review count.
- Seller reviews cannot be viewed from Seller Profile.
- Core live-shopping flow fails.
- Real live video cannot be demonstrated.
- Live Claim/reservation behaviour fails.
- Successfully purchased live item does not become Sold.
- Non-approved users can improperly start a live.
- Serious authentication or security problem exists.
- Important navigation/buttons do not work.
- Major mobile-layout failure exists on required devices.
- Critical loading/error/access-denied states trap the user.
- Unresolved Critical Reviewer findings remain.

---

# Prototype boundary

The 34-screen prototype demonstrates Throve's approved product experience.

It deliberately does **not** represent a production-ready marketplace.

Real payments, seller payouts, production identity verification, automated refunds, chargebacks, production courier infrastructure, auctions, live gifting, multi-host live and other later-version systems must not be treated as complete merely because related prototype journeys can be simulated.

The lightweight seller rating/review feature is part of the prototype, but production-scale review moderation, disputes, editing, analytics and other advanced review functionality remain outside prototype scope.
