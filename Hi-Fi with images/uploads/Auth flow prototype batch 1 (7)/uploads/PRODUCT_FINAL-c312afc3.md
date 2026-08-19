# PRODUCT.md

## Throve Product Definition

**Document status:** Final  
**Last updated:** 17 August 2026 — implementation decisions resolved  
**Current product name:** Throve

---

## 1. Product summary

Throve is a **mobile-first social fashion and beauty resale marketplace with live-shopping features**.

The aim is to combine:

- Buying and selling fashion and beauty items, both new and pre-owned.
- A social, engaging shopping experience.
- Live-shopping experiences where products can be presented and purchased.
- Buyer and seller communication.
- Offers and negotiation.
- Lightweight marketplace trust through seller ratings and reviews.

Throve is currently the working product name. Whether Throve will remain the final brand name is **To be decided**.

---

## 2. Current product stage

Throve is currently being developed as a **first working prototype**.

The prototype is intended to demonstrate the main Throve experience and allow the product journeys to be tested before production systems are introduced.

The first prototype must not automatically be treated as a production-ready application.

A production-ready application would require additional work, testing and specialist review, particularly for:

- User accounts and authentication.
- Payments.
- Seller payouts.
- Database permissions.
- Private messages.
- Personal user data.
- User-uploaded content.
- Order security.
- Refunds and disputes.
- Live-video permissions.
- Security and privacy.

A feature must not be marked complete simply because a coding agent says it is complete.

Completion must be supported by evidence such as:

- Successful testing.
- Screenshots.
- Screen recordings.
- A working preview.
- Direct founder testing.
- Relevant automated tests.
- Reviewer-agent findings where appropriate.

---

## 3. Confirmed decisions

The following decisions have been confirmed through the Throve project.

### Product direction

- The current product name is **Throve**.
- Throve will focus on fashion and beauty resale.
- Throve will support new, unused and pre-owned items.
- Throve will be designed primarily for mobile use.
- Throve will include social marketplace elements.
- Live shopping is a core Throve experience and product differentiator.
- The initial launch country is **Nigeria**.
- The platform will be **one shared application for both iPhone and Android**.
- One Throve account can act as both a buyer and a seller.
- The first prototype will use real user accounts.
- The prototype will use simulated purchases without real money.
- The first prototype will use real live video.
- Live hosting will initially be limited to approved or invited sellers.
- Sellers will be responsible for shipping purchased items to buyers.
- Seller ratings and reviews will be included in the prototype.

### Build approach

- The project will be built with extensive AI assistance.
- Codex and other AI agents may be used to help build and review the product.
- Instructions and project tasks should be written in clear, non-technical language.
- The project should be built in small, controlled stages.
- Formal product validation is not being completed before the first build.
- User testing will still be required once the prototype is available.
- AI-agent claims alone are not evidence that work is complete.
- High-risk features require technical review before Throve handles real public users, sensitive information or money.
- Prototype functionality must remain clearly separated from production-ready functionality.

---

## 4. Intended users

Throve's main target customers are:

### Buyers

Individuals who want to:

- Buy pre-owned, used or unused personal fashion and beauty items.
- Save money through thrifting.
- Discover fashion and beauty listings.
- Save or favourite products.
- Contact sellers.
- Make and respond to relevant offers.
- Purchase items.
- Participate in live shopping.
- Review a seller after a completed Throve transaction.

### Okrika sellers

Okrika sellers who want to:

- List and sell fashion items.
- Reach potential buyers.
- Present and promote products.
- Communicate with interested buyers.
- Receive and respond to offers.
- Potentially sell through live-shopping sessions.
- Build marketplace trust through completed-transaction ratings and reviews.

### Individual sellers

Individuals who want to:

- Sell used or unused personal fashion and beauty items.
- Make back some of the money originally spent on those items.
- List and present items.
- Communicate with interested buyers.
- Receive and respond to offers.
- Build a seller rating through completed transactions.

### Live-shopping hosts

A seller may also act as a live-shopping host.

During the initial controlled live phase, only approved or invited sellers will be allowed to host live sessions.

Other users may eventually gain live-hosting access after meeting requirements set by Throve.

The exact long-term host qualification requirements remain **To be decided**.

---

## 5. The problem Throve intends to address

Throve is intended to make fashion and beauty resale more social, engaging and interactive than a traditional listings-only marketplace.

The product brings together:

- New, unused and pre-owned fashion and beauty items.
- Okrika and second-hand fashion in Nigeria.
- Affordable thrifting.
- A way for individuals to recover some money from items they no longer need.
- Social discovery.
- Buyer and seller communication.
- Offers and negotiation.
- Seller trust through transaction-based ratings and reviews.
- Seller-led content.
- Real live product presentation.

The main target customer groups are confirmed.

The strongest reason users will ultimately choose Throve instead of existing marketplaces should still be tested through prototype feedback rather than treated as a proven fact.

---

## 6. First prototype objective

The purpose of the first prototype is to demonstrate that the main Throve experience works as a mobile application.

The prototype should help answer:

1. Can a user understand what Throve is?
2. Can a user create and use a real account?
3. Can a user discover fashion and beauty items?
4. Can a user browse the approved department and category structure?
5. Can a user find products through Search without Search occupying permanent navigation space?
6. Can a seller create and present an item for sale?
7. Can a buyer save or favourite an item?
8. Can buyers and sellers communicate privately?
9. Can buyers and sellers use offers and counter-offers?
10. Does Throve feel social rather than like a basic classified-ad marketplace?
11. Is Live Shopping clearly visible as a core part of Throve?
12. Can users discover and watch real live-shopping sessions?
13. Can a purchase journey be demonstrated without real money?
14. Can a buyer leave a seller rating after a completed Throve transaction?
15. Can users move through the main experience without becoming confused?

---

## 7. First prototype scope

The first prototype should represent the following confirmed parts of the product.

### A. Mobile-first experience and main navigation

The experience should be designed for phone-sized screens first.

Throve's permanent bottom navigation will contain exactly five destinations:

1. **Home**
2. **Live**
3. **Sell**
4. **Inbox**
5. **Profile**

No sixth permanent navigation item should be added.

#### Home

Home acts as a main marketplace and discovery destination.

Home may include:

- New listings.
- Marketplace discovery.
- Categories.
- Seller discovery where appropriate.
- Live Now previews.
- Upcoming Live previews.

#### Live

Live is a permanent main navigation destination because live shopping is a core Throve experience and product differentiator.

Tapping **Live** opens the existing Live-Shopping Discovery experience.

The Live area provides access to:

- Live Now sessions.
- Upcoming live sessions.
- Host and seller information.
- Active live sessions.
- The Live-Shopping Viewer.

Home may continue to display Live Now and Upcoming Live previews.

Those previews may link directly to an active live session or into the Live discovery area.

This change increases the prominence of the existing live-shopping experience. It does not add a separate second live-discovery feature.

#### Search

Search remains an important included prototype feature, but it is **not** a permanent bottom-navigation destination.

Search should be accessible through a prominent search icon from Home and from other appropriate discovery areas where useful.

Search functionality must not be removed simply because it no longer occupies a bottom-navigation position.

Desktop support may be considered later, but it should not control the initial mobile design.

---

### B. Marketplace department and category structure

Throve will use a clear distinction between:

- **Department**
- **Category**

For example:

**Department:** Women  
**Category:** Shoes

Women and Shoes must not be treated as unrelated entries in one flat category list.

#### Main marketplace departments

The approved departments are:

- All.
- Women.
- Men.
- Kids.

**All** is a browsing and filtering scope only.

It is **not** stored as a product's department.

The marketplace UI should use the term **Kids**, not Children, for this department.

Unisex is not included at this stage.

#### Women

Women subcategories are:

- All.
- Clothing.
- Shoes.
- Bags.
- Accessories.
- Beauty.

#### Men

Men subcategories are:

- All.
- Clothing.
- Shoes.
- Bags.
- Accessories.
- Grooming.

#### Kids

Kids subcategories are:

- All.
- Clothing.
- Shoes.
- Bags.
- Accessories.

Within each department, **All** is a browsing/filter option and is not stored as a product category.

The prototype should not introduce extra category levels or a large category taxonomy beyond this approved structure.

---

### C. Product conditions

Products may be listed using the following conditions:

- New with tags.
- New without tags.
- Very good.
- Good.
- Satisfactory.

This allows Throve to support new, unused and pre-owned items.

---

### D. Marketplace discovery and Search

The prototype must demonstrate how users discover and view products.

Confirmed marketplace functions include:

- Home discovery.
- Product listings.
- Product detail pages.
- Department and category browsing.
- Search.
- Filters and sorting within Search/Search Results.
- Saving or favouriting products.
- Seller profiles.
- Seller ratings and reviews.
- Live-shopping discovery.

Search should support finding appropriate marketplace content such as:

- Products.
- Brands.
- Sellers.
- Categories where appropriate.

Search is accessed through prominent search controls rather than permanent bottom navigation.

The prototype does not require an advanced recommendation algorithm.

Simple seeded, recent or sample marketplace discovery is acceptable for the prototype.

---

### E. Seller listing experience

The prototype must demonstrate how a seller presents a product for sale.

Each listing should include the approved product information.

#### Required listing information

- At least one photo.
- Item title.
- Department.
- Category.
- Condition.
- Price.
- Brand.
- Description.
- Shipping information.

Size is required when relevant to the selected product category.

The Department and Category values must follow the approved marketplace hierarchy.

Examples:

**Department:** Women  
**Category:** Shoes

or:

**Department:** Men  
**Category:** Grooming

**All** must not be stored as the Department or Category of an individual listing.

The prototype may allow up to eight photographs, with the first photograph acting as the main listing image.

The seller may reorder photographs.

The current suggested limits are:

- Item title: up to approximately 80 characters.
- Description: up to approximately 1,000 characters.

The prototype listing journey includes:

- Save as Draft.
- Preview.
- Publish.
- Edit.
- Deactivate or hide.
- Delete when no active transaction exists.

Relisting is not required for the first prototype.

---

### F. Social experience

Throve should feel like a social marketplace rather than only a product-listing catalogue.

Confirmed prototype social features include:

- Users can save or favourite products.
- Buyers can privately message sellers.
- Sellers can privately message interested buyers under the approved contact rules.
- Buyers can make offers.
- Sellers can accept, reject or counter-offer.
- Sellers can send offers to interested buyers.
- Users can comment during live-shopping sessions.
- Product listings do **not** have public comment sections.
- Seller profiles can display marketplace trust information through seller ratings and reviews.

Private messaging and personal user data are high-risk areas requiring technical review.

---

### G. Seller ratings and reviews

Seller ratings and reviews are included in the first prototype as a lightweight marketplace trust feature.

The approved prototype rules are:

- Only a buyer from a **Completed Throve transaction** can review the seller for that transaction.
- Only one review is allowed per completed transaction.
- The rating uses **1–5 stars**.
- A written review/comment is optional.
- A seller's aggregate average star rating is displayed.
- A seller's total review count is displayed.
- Individual buyer reviews can be viewed from the seller profile.
- Sellers with no reviews display **“No reviews yet.”**
- The buyer is offered the ability to leave a review after the relevant order reaches **Completed** status.

The first prototype does not include:

- Seller responses to reviews.
- Review likes.
- Review photos or videos.
- Complex review sorting.
- Review editing.
- Review disputes.
- Separate review analytics.
- Complex review moderation.

Reviews are transaction-based feedback and are separate from public product comments.

Ordinary product listings continue to have **no public comments**.

---

### H. Live-shopping experience

The first prototype will use **real live video**.

Live Shopping is a permanent bottom-navigation destination through the **Live** tab.

The existing live-shopping experience includes:

- Live-Shopping Discovery.
- Live Now.
- Upcoming live sessions.
- Host information.
- Real live video.
- Live comments.
- Featured or pinned products.
- Live product claims.
- Simulated purchase journeys.
- Product Available, Reserved and Sold states.

During the controlled phase:

- Only approved or invited sellers may host.
- Viewers can watch live sessions.
- Users can comment during live sessions.
- Approved hosts can prepare and run live sessions.

No separate duplicate Live Discovery experience should be created.

The following remain outside the prototype unless separately approved:

- Auctions.
- Live gifting.
- Paid gifts.
- Multi-host live.
- Creator commissions.
- Complex giveaways.
- Advanced automated moderation.

How live shopping may expand beyond the approved prototype remains **To be decided**.

---

## 8. Account, purchase, shipping and refund approach

### Real accounts

The first prototype will contain **real user accounts**, not simulated accounts.

One account can be used to:

- Buy.
- Sell.
- Save products.
- Make offers.
- Chat.
- Participate in live shopping.

Only approved or invited accounts may initially host live sessions.

Authentication, account recovery, database permissions and personal user data are high-risk areas requiring technical review.

### Approved prototype implementation decisions

The following first-prototype implementation decisions are approved:

- **Account Recovery:** registered email address → new magic login link. Neutral confirmation wording must not reveal whether an email address is registered. Password reset, SMS recovery, security questions and identity-document recovery are not included.
- **Delivery methods:** Standard Delivery — ₦2,500 — estimated 2–5 working days; Express Delivery — ₦4,000 — estimated 1–2 working days.
- **Delivery-charge calculation:** the selected fixed prototype/demo delivery charge is added to the item price. No live courier quote, distance calculation or package-weight calculation is required.
- **Order cancellation:** buyer or seller may cancel while Paid or Awaiting dispatch. Cancellation is unavailable after Dispatched. A successful pre-dispatch cancellation changes the order to Cancelled and automatically returns the listing to Available. No refund process is required because no real money was collected.
- **Delete Account:** the prototype deactivates the account rather than immediately destroying all related records. The user is logged out, normal access is disabled and active listings are hidden/deactivated. Records needed to preserve transaction, order, review and marketplace integrity may be retained. Production deletion, anonymisation and retention require later privacy, legal and technical review.

Prototype cancellation reasons may be limited to Changed my mind, Unable to fulfil order, Item unavailable and Other. Cancellation disputes, penalties, refund calculations and automated enforcement are not included.

### Purchases in the prototype

The first prototype will include a purchase journey without exchanging real money.

This means:

- Buyers can move through the approved buying journey.
- No real payment will be collected.
- No real seller payout will take place.
- Successful prototype purchases may create simulated orders.
- Listing status can change as the simulated purchase progresses.

The prototype must clearly tell users when a purchase is simulated and that no real money will be charged.

### Shipping in the real system

Sellers will ship purchased items to buyers.

The detailed production courier, pricing, tracking and shipping arrangements remain **To be decided**.

### Damaged, false or undelivered items

The confirmed product principle is:

- The buyer will receive a full refund after providing acceptable evidence.
- A damaged, false or materially misrepresented item will be returned to the seller.
- An undelivered item cannot be returned because the buyer never received it.

The detailed production refund, evidence, return and dispute process remains **To be decided**.

No production refund or chargeback system is included in the first prototype.

---

## 9. Features not automatically included in the first prototype

The following features must not be added to the first prototype unless separately approved:

- Real payment processing.
- Seller payouts.
- Production-level identity verification.
- Push notifications unless separately approved.
- Automated returns.
- A production buyer or seller dispute system.
- Production refund processing.
- Chargeback handling.
- Production shipping-label creation.
- Automated production courier tracking.
- Advanced recommendation systems.
- Complex seller analytics.
- Real-money listing boosts.
- Production Throve-operated shipping services.
- Subscription plans.
- Loyalty or reward systems.
- International buying and selling.
- Multiple currencies.
- Multiple languages.
- A full production moderation system.
- A full production customer-support system.
- Separate native iPhone and Android applications beyond the shared-app approach.
- Production-scale live-video infrastructure.
- Auctions.
- Live gifting.
- Paid live gifts.
- Multi-host live sessions.
- Creator commissions.
- Review responses.
- Review likes.
- Review photos or videos.
- Complex review sorting or analytics.

**Seller ratings and reviews are included in the prototype** under the lightweight rules defined in Section 7G.

Some excluded features may eventually be required before public launch, but they are not automatically prototype requirements.

---

## 10. Possible later versions

The following are possible later-version areas and are not automatic commitments.

### Later version: Payments and revenue

Possible additions include:

- Real payment processing.
- Buyer protection fees collected during real transactions.
- Payment-processing charges.
- Seller payouts.
- Real-money paid seller listing boosts.
- Revenue from shipping services.

### Later version: Trust and safety

Possible additions include:

- Expanded user reporting.
- Advanced listing moderation.
- Production seller verification.
- Structured dispute handling.
- Counterfeit-item controls.
- More advanced review moderation if later needed.

The basic seller rating and review system itself is **already part of the prototype**.

### Later version: Social features

Possible additions include:

- Following users.
- Sharing.
- Seller updates.
- Personalised feeds.
- Other deliberately approved social features.

Public product comments are not currently approved.

### Later version: Live shopping

Possible additions could include deliberately approved extensions beyond the prototype.

The first prototype does **not** include:

- Auctions.
- Live gifting.
- Paid gifts.
- Multi-host live.
- Creator commissions.
- Complex giveaways.

Any expansion to the live-shopping model must be approved separately.

### Later version: Seller tools

Possible additions include:

- Complex sales analytics.
- Stock management.
- Real-money promotion tools.
- Bulk listing.
- Production shipping management.
- Seller subscriptions.

Each later-version feature must be reviewed before being added to the roadmap.

---

## 11. Business model

Throve plans to make money through:

- Buyer protection fees.
- Payment-processing charges.
- Optional paid listing boosts for sellers.
- Shipping services at a later stage.

The following details remain **To be decided**:

- The amount of each fee.
- Whether buyer protection will use a fixed fee or percentage.
- Whether payment-processing charges will be displayed separately.
- The price and duration of listing boosts.
- When paid listing boosts will be introduced.
- How Throve will earn revenue from shipping.
- Which fees will be present in the first public version.

No real fee should be collected in the prototype.

---

## 12. Market and launch location

The initial country for Throve is **Nigeria**.

This affects:

- Currency.
- Payment providers.
- Seller payouts.
- Taxes.
- Consumer-protection rules.
- Privacy requirements.
- Shipping options.
- Returns and refunds.
- Age requirements.
- Identity requirements.

Throve should not be treated as ready for public transactions until the relevant Nigerian legal, payment, privacy and consumer-protection requirements have been reviewed.

---

## 13. Platform decision

Throve will be built as **one shared application for both iPhone and Android**.

This is intended to:

- Give users a consistent experience.
- Reduce duplicated development work.
- Simplify early product development and testing.

The application remains mobile-first.

---

## 14. Prototype success criteria

The first prototype will not be considered successful simply because it opens or looks attractive.

At minimum:

- The purpose of Throve is understandable.
- Real prototype users can create and access accounts.
- The main mobile navigation works correctly.
- The bottom navigation contains Home, Live, Sell, Inbox and Profile.
- Search remains easy to find through the approved search controls.
- A user can browse the approved Department and Category structure.
- A user can discover and view fashion or beauty products.
- A seller can create and publish a correctly classified listing.
- A user can save or favourite a product.
- Buyer and seller private communication can be demonstrated.
- The approved offer and counter-offer journey can be demonstrated.
- A simulated purchase can be completed without collecting real money.
- Seller and buyer order journeys can be demonstrated.
- A buyer can leave one 1–5 star seller review after an eligible Completed transaction.
- Seller profiles correctly show average rating, review count and individual reviews.
- Sellers with no reviews display “No reviews yet.”
- Live Shopping is clearly discoverable through the permanent Live destination.
- Real live video works well enough to demonstrate the live-shopping experience.
- Live comments can be demonstrated.
- Relevant Available, Reserved and Sold states work.
- Important buttons and navigation work.
- Relevant loading, empty and error states are considered.
- There are no obvious broken screens.
- The prototype is tested on phone-sized screens.
- Screenshots or recordings exist as evidence.
- The founder personally tests the main journeys.
- Known problems and unfinished areas are recorded.

The exact final approval evidence and measurable user-testing goals remain **To be decided**.

---

## 15. Production-readiness rule

A working prototype is not automatically a production-ready product.

Before Throve handles real public users, sensitive information or money, the following areas require additional technical and product review:

- Authentication.
- Account recovery.
- Database access and permissions.
- Personal information.
- User-uploaded photographs and content.
- Buyer and seller private messages.
- Live comments.
- Seller ratings and reviews.
- Payment processing.
- Seller payouts.
- Refunds.
- Chargebacks.
- Order security.
- Delivery information.
- Platform moderation.
- Live-video permissions.
- Admin access.
- Legal requirements.
- Privacy requirements.
- Consumer-protection requirements.

The prototype review system does not remove the need for future moderation, security and dispute-handling decisions before public launch.

These areas require evidence of testing and technical review before being treated as production-ready.

---

## 16. Important unresolved questions

The following product decisions remain open:

1. How will live shopping expand beyond the approved prototype?
2. What exact evidence will be required before the overall prototype receives final approval?
3. What must be included in the first public version?
4. Is Throve the final brand name?

Additional implementation details that have not been separately approved should remain **To be decided** rather than being silently resolved.

---

## 17. Scope-control rule

New features must not be added simply because:

- An AI agent suggests them.
- A competitor has them.
- They sound useful.
- They might be needed eventually.

A feature should only enter the first prototype when:

- It supports the main Throve concept.
- It is required for an approved user journey.
- Its risks and dependencies are understood.
- It has a clear definition of done.
- It can be tested.
- It has been deliberately approved.

The new permanent Live destination, approved Department/Category hierarchy and lightweight seller review system are deliberate prototype decisions.

They must not be used as justification to expand unrelated prototype scope.

Everything else should remain outside the prototype unless deliberately approved.

---

## 18. Current product statement

Throve is a mobile-first social fashion and beauty resale marketplace initially focused on Nigeria.

It supports new, unused and pre-owned products and uses one shared application for iPhone and Android.

One Throve account can both buy and sell.

The main bottom navigation is:

1. Home.
2. Live.
3. Sell.
4. Inbox.
5. Profile.

Live Shopping is a permanent main destination because it is a core Throve experience and differentiator.

Search remains an important prototype feature and is accessed through prominent search controls rather than a permanent bottom-navigation tab.

Marketplace classification uses **Department** and **Category**.

The main departments are:

- All.
- Women.
- Men.
- Kids.

All is a browsing/filter scope rather than a stored listing classification.

Women, Men and Kids use their approved subcategory structures, including Beauty under Women and Grooming under Men.

The prototype includes:

- Real accounts.
- Product listings.
- Department and category browsing.
- Search.
- Saved/favourite products.
- Buyer and seller private messaging.
- Offers and counter-offers.
- Simulated purchases without real money.
- Orders and delivery simulation.
- Seller ratings and reviews after completed Throve transactions.
- Real live video.
- Live comments.
- Live product presentation and claims.
- Invite-only live hosting.

Seller reviews use 1–5 stars, may include an optional written comment, and contribute to the seller's displayed average rating and total review count.

Ordinary product listings do not have public comments.

The prototype does not include real payments, seller payouts, auctions, live gifting, multi-host live, production identity verification or other unapproved production functionality.

The full post-prototype live-shopping model, final prototype approval evidence, first public-version scope and final brand name remain **To be decided**.
