import SwiftUI

struct LogClimbView: View {
    @State private var mountains: [Mountain] = []
    @State private var selectedMountainId: Int?
    @State private var date = Date()
    @State private var notes = ""
    @State private var visibility = "public"
    @State private var isSaving = false
    @State private var error: String?
    @State private var showSuccess = false

    var body: some View {
        NavigationView {
            Form {
                Section("Peak") {
                    if mountains.isEmpty {
                        ProgressView()
                    } else {
                        Picker("Mountain", selection: $selectedMountainId) {
                            Text("Select a peak").tag(nil as Int?)
                            ForEach(mountains) { m in
                                Text("\(m.name) — \(m.elevation.formatted()) ft")
                                    .tag(m.id as Int?)
                            }
                        }
                    }
                }

                Section("Date") {
                    DatePicker(
                        "Climb Date",
                        selection: $date,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                }

                Section("Notes (optional)") {
                    TextEditor(text: $notes)
                        .frame(minHeight: 80)
                }

                Section("Visibility") {
                    Picker("Who can see this", selection: $visibility) {
                        Text("Public").tag("public")
                        Text("Followers").tag("followers")
                        Text("Private").tag("private")
                    }
                    .pickerStyle(.segmented)
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }

                Section {
                    Button {
                        Task { await save() }
                    } label: {
                        HStack {
                            Spacer()
                            Text(isSaving ? "Saving…" : "Log Climb")
                                .bold()
                            Spacer()
                        }
                    }
                    .disabled(selectedMountainId == nil || isSaving)
                }
            }
            .navigationTitle("Log a Climb")
            .alert("Climb Logged!", isPresented: $showSuccess) {
                Button("Done") { resetForm() }
            } message: {
                Text("Your summit has been recorded.")
            }
        }
        .task {
            mountains = (try? await APIClient.shared.mountains()) ?? []
        }
    }

    private func save() async {
        guard let mountainId = selectedMountainId else { return }
        isSaving = true
        error = nil
        defer { isSaving = false }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        do {
            _ = try await APIClient.shared.logClimb(
                mountainId: mountainId,
                date: formatter.string(from: date),
                notes: notes.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : notes,
                visibility: visibility
            )
            showSuccess = true
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func resetForm() {
        selectedMountainId = mountains.first?.id
        date = Date()
        notes = ""
        visibility = "public"
    }
}
