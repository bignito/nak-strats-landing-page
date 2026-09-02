import Result "mo:core/Result";
import Time "mo:core/Time";
import List "mo:core/List";
import Text "mo:core/Text";
import Char "mo:core/Char";
import Runtime "mo:core/Runtime";
import Types "../types/storefront";

module {
  // Slug generation: lowercase, spaces to hyphens, strip non-alphanumerics.
  // Mirrors the migration's slugify so migrated slugs match admin-created ones.
  func slugify(name : Text) : Text {
    let chars = name.toLower().toArray();
    var out = "";
    for (c in chars.values()) {
      if (c.isAlphabetic() or c.isDigit()) {
        out := out # c.toText();
      } else if (c == ' ') {
        out := out # "-";
      };
    };
    out;
  };

  // Returns the active categories sorted by sortOrder, each with a productCount
  // of visible (active, non-admin_only) products that reference its slug.
  public func listCategories(categories : List.List<Types.Category>, products : List.List<Types.Product>) : [Types.CategoryWithCount] {
    let visible = products.toArray().filter(func p = p.active and not p.admin_only);
    let active = categories.toArray().filter(func c = c.active);
    let sorted = active.sort(func (a, b) = Nat.compare(a.sortOrder, b.sortOrder));
    sorted.map(func c = {
      category = c;
      productCount = visible.filter(func p = p.category == c.slug).size();
    });
  };

  // Creates a category. The slug is auto-generated from name (lowercase, spaces
  // to hyphens, strip non-alphanumerics) and rejected on collision or empty;
  // names are trimmed and rejected if empty.
  public func createCategory(categories : List.List<Types.Category>, name : Text, description : ?Text) : Result.Result<Types.Category, Types.CategoryError> {
    let trimmed = name.trim(#char ' ');
    if (trimmed == "") { return #err(#emptyName) };
    let slug = slugify(trimmed);
    if (slug == "") { return #err(#emptyName) };
    if (categories.toArray().any(func c = c.slug == slug)) {
      return #err(#slugCollision(slug));
    };
    let now = Time.now();
    let category : Types.Category = {
      id = categories.size() + 1;
      slug;
      name = trimmed;
      description;
      sortOrder = categories.size();
      active = true;
      showWhenEmpty = false;
      created_at = now;
      updated_at = now;
    };
    categories.add(category);
    #ok(category);
  };

  // Updates name, description, sortOrder, active, showWhenEmpty. The slug is
  // NOT editable — it stays immutable so existing products and orders stay
  // linked.
  public func updateCategory(
    categories : List.List<Types.Category>,
    id : Types.CategoryId,
    name : Text,
    description : ?Text,
    sortOrder : Nat,
    active : Bool,
    showWhenEmpty : Bool,
  ) : Result.Result<Types.Category, Types.CategoryError> {
    let trimmed = name.trim(#char ' ');
    if (trimmed == "") { return #err(#emptyName) };
    switch (categories.find(func c = c.id == id)) {
      case null { #err(#notFound(id)) };
      case (?category) {
        let updated : Types.Category = {
          id = category.id;
          slug = category.slug;
          name = trimmed;
          description;
          sortOrder;
          active;
          showWhenEmpty;
          created_at = category.created_at;
          updated_at = Time.now();
        };
        let snapshot = categories.toArray();
        categories.clear();
        for (c in snapshot.values()) {
          if (c.id == id) { categories.add(updated) } else { categories.add(c) };
        };
        #ok(updated);
      };
    };
  };

  // Reorders categories to match the supplied ordered array of ids, persisting
  // sortOrder accordingly.
  public func reorderCategories(categories : List.List<Types.Category>, orderedIds : [Types.CategoryId]) : Result.Result<(), Types.CategoryError> {
    let snapshot = categories.toArray();
    if (orderedIds.size() != snapshot.size()) { return #err(#notFound(0)) };
    let seen = List.empty<Types.CategoryId>();
    for (id in orderedIds.values()) {
      if (seen.contains(id)) { return #err(#notFound(id)) };
      seen.add(id);
      if (snapshot.find(func c = c.id == id) == null) { return #err(#notFound(id)) };
    };
    let now = Time.now();
    let reordered = List.empty<Types.Category>();
    for (i in orderedIds.keys()) {
      let id = orderedIds[i];
      let category = snapshot.find(func c = c.id == id) ?? Runtime.trap("Category not found");
      reordered.add({
        id = category.id;
        slug = category.slug;
        name = category.name;
        description = category.description;
        sortOrder = i;
        active = category.active;
        showWhenEmpty = category.showWhenEmpty;
        created_at = category.created_at;
        updated_at = now;
      });
    };
    categories.clear();
    for (c in reordered.values()) { categories.add(c) };
    #ok();
  };

  // Deletes a category. Refuses (with an error naming the count) when any
  // product still references the slug.
  public func deleteCategory(categories : List.List<Types.Category>, products : List.List<Types.Product>, id : Types.CategoryId) : Result.Result<(), Types.CategoryError> {
    switch (categories.find(func c = c.id == id)) {
      case null { #err(#notFound(id)) };
      case (?category) {
        let count = products.toArray().filter(func p = p.category == category.slug).size();
        if (count > 0) {
          return #err(#productsReferenced({ slug = category.slug; count }));
        };
        let snapshot = categories.toArray();
        categories.clear();
        for (c in snapshot.values()) {
          if (c.id != id) { categories.add(c) };
        };
        #ok();
      };
    };
  };

  // Rewrites every product whose category slug equals fromSlug to toSlug so an
  // admin can clear a category before deleting it. Returns the number of
  // products reassigned. Refuses when the target slug is not an existing
  // category, so products are never left pointing at an unknown slug.
  public func reassignProducts(categories : List.List<Types.Category>, products : List.List<Types.Product>, fromSlug : Text, toSlug : Text) : Result.Result<Nat, Types.CategoryError> {
    if (fromSlug == toSlug) { return #err(#targetCategoryNotFound(toSlug)) };
    if (not categories.toArray().any(func c = c.slug == toSlug)) {
      return #err(#targetCategoryNotFound(toSlug));
    };
    let snapshot = products.toArray();
    var count = 0;
    let updated = snapshot.map(func p = if (p.category == fromSlug) {
      count += 1;
      { p with category = toSlug; updated_at = Time.now() };
    } else {
      p;
    });
    products.clear();
    for (p in updated.values()) { products.add(p) };
    #ok(count);
  };
};