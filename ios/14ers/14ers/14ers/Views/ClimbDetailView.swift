import SwiftUI

private let bg = Color(red: 3/255, green: 7/255, blue: 18/255)
private let card = Color(red: 17/255, green: 24/255, blue: 39/255)
private let emerald = Color(red: 52/255, green: 211/255, blue: 153/255)

struct ClimbDetailView: View {
    let climbId: Int

    @State private var climb: Climb?
    @State private var mountains: [Mountain] = []
    @State private var error: String?
    @State private var liked = false
    @State private var likeCount = 0
    @State private var showEdit = false
    @State private var showDeleteConfirm = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 0) {
                if let climb {
                    if let photoUrl = climb.photoUrl, let url = URL(string: photoUrl) {
                        AsyncImage(url: url) { img in
                            img.resizable().aspectRatio(contentMode: .fill)
                        } placeholder: {
                            card
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 280)
                        .clipped()
                    }

                    VStack(alignment: .leading, spacing: 14) {
                        HStack(alignment: .top) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(climb.mountainName)
                                    .font(.title2.bold())
                                    .foregroundColor(.white)
                                Text("\(climb.elevation.formatted()) ft")
                                    .font(.headline)
                                    .foregroundColor(emerald)
                                Text(climb.range)
                                    .font(.caption)
                                    .foregroundColor(.gray)
                            }
                            Spacer()
                            Text(climb.climbDate.formattedClimbDate())
                                .font(.subheadline)
                                .foregroundColor(.white)
                                .multilineTextAlignment(.trailing)
                        }

                        if let notes = climb.notes, !notes.isEmpty {
                            Text(notes)
                                .font(.body)
                                .foregroundColor(Color(red: 209/255, green: 213/255, blue: 219/255))
                                .padding()
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(card)
                                .cornerRadius(10)
                        }

                        HStack(spacing: 10) {
                            if climb.isOwner == true {
                                Button("Edit") { showEdit = true }
                                    .buttonStyle(.bordered)
                                    .tint(.white)
                            }

                            Button {
                                toggleLike()
                            } label: {
                                Label(
                                    likeCount > 0 ? "\(likeCount)" : (liked ? "Loved" : "Love"),
                                    systemImage: liked ? "heart.fill" : "heart"
                                )
                            }
                            .buttonStyle(.bordered)
                            .tint(liked ? .red : .gray)

                            Spacer()

                            if climb.isOwner == true {
                                Button(role: .destructive) {
                                    showDeleteConfirm = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                                .buttonStyle(.bordered)
                                .tint(.red)
                            }
                        }
                    }
                    .padding()

                } else if let error {
                    Text(error).foregroundColor(.red).padding()
                } else {
                    ProgressView()
                        .tint(.white)
                        .frame(maxWidth: .infinity, minHeight: 260)
                }
            }
        }
        .background(bg.ignoresSafeArea())
        .navigationBarTitleDisplayMode(.inline)
        .confirmationDialog(
            "Delete this climb?",
            isPresented: $showDeleteConfirm,
            titleVisibility: .visible
        ) {
            Button("Delete", role: .destructive) { Task { await deleteClimb() } }
            Button("Cancel", role: .cancel) {}
        }
        .sheet(isPresented: $showEdit) {
            if let climb {
                EditClimbView(climb: climb, mountains: mountains) { updated in
                    self.climb = updated
                    showEdit = false
                }
            }
        }
        .task { await load() }
    }

    private func load() async {
        do {
            async let c = APIClient.shared.climb(climbId)
            async let ms = APIClient.shared.mountains()
            let (fetched, fetchedMountains) = try await (c, ms)
            climb = fetched
            mountains = fetchedMountains
            liked = fetched.isLiked ?? false
            likeCount = fetched.likeCount ?? 0
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func toggleLike() {
        let prev = liked
        liked = !prev
        likeCount += prev ? -1 : 1
        Task {
            do {
                let r = try await APIClient.shared.likeClimb(climbId)
                liked = r.liked
                likeCount = r.count
            } catch {
                liked = prev
                likeCount += prev ? 1 : -1
            }
        }
    }

    private func deleteClimb() async {
        do {
            try await APIClient.shared.deleteClimb(climbId)
            dismiss()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct EditClimbView: View {
    let climb: Climb
    let mountains: [Mountain]
    let onSave: (Climb) -> Void

    @State private var mountainId: Int
    @State private var date: Date
    @State private var notes: String
    @State private var visibility: String
    @State private var isSaving = false
    @State private var error: String?
    @Environment(\.dismiss) private var dismiss

    init(climb: Climb, mountains: [Mountain], onSave: @escaping (Climb) -> Void) {
        self.climb = climb
        self.mountains = mountains
        self.onSave = onSave
        _mountainId = State(initialValue: climb.mountainId)
        let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
        _date = State(initialValue: fmt.date(from: climb.climbDate) ?? Date())
        _notes = State(initialValue: climb.notes ?? "")
        _visibility = State(initialValue: climb.visibility)
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Peak") {
                    Picker("Mountain", selection: $mountainId) {
                        ForEach(mountains) { m in
                            Text("\(m.name) — \(m.elevation.formatted()) ft").tag(m.id)
                        }
                    }
                }
                Section("Date") {
                    DatePicker("Date", selection: $date, in: ...Date(), displayedComponents: .date)
                }
                Section("Notes") {
                    TextEditor(text: $notes).frame(minHeight: 80)
                }
                Section("Visibility") {
                    Picker("Visibility", selection: $visibility) {
                        Text("Public").tag("public")
                        Text("Followers").tag("followers")
                        Text("Private").tag("private")
                    }
                    .pickerStyle(.segmented)
                }
                if let error {
                    Section { Text(error).foregroundColor(.red).font(.caption) }
                }
            }
            .navigationTitle("Edit Climb")
            .navigationBarItems(
                leading: Button("Cancel") { dismiss() },
                trailing: Button(isSaving ? "Saving…" : "Save") {
                    Task { await save() }
                }
                .disabled(isSaving)
            )
        }
    }

    private func save() async {
        isSaving = true
        error = nil
        defer { isSaving = false }
        let fmt = DateFormatter(); fmt.dateFormat = "yyyy-MM-dd"
        do {
            let updated = try await APIClient.shared.updateClimb(
                climb.id,
                mountainId: mountainId,
                date: fmt.string(from: date),
                notes: notes,
                visibility: visibility
            )
            onSave(updated)
        } catch {
            self.error = error.localizedDescription
        }
    }
}
